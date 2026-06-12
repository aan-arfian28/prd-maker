/**
 * Parser for text-based flowcharts that LLMs sometimes output.
 *
 * Converts text flowchart notation into Mermaid flowchart syntax.
 *
 * Supported notation:
 *   [Mulai] -> Step 1 -> Step 2
 *           -> Decision?
 *              |-- YA  -> Branch A Node 1 -> Branch A Node 2
 *              |-- TIDAK -> Branch B
 *           -> Step 3 -> [Selesai]
 */

// ── types ──────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  text: string;
  type: "terminal" | "process" | "decision";
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

// ── public API ─────────────────────────────────────────────────────

/**
 * Detect whether a text block looks like a text-based flowchart.
 */
export function isTextFlowchart(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());

  let arrowCount = 0;
  let branchCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Count actual "->" occurrences (not just lines)
    const arrows = trimmed.match(/->/g);
    if (arrows) arrowCount += arrows.length;
    if (/^\|--/.test(trimmed)) branchCount++;
  }

  if (arrowCount === 0) return false;

  // Reject if it looks like actual code (not flowchart descriptions
  // which may contain parentheses, slashes, etc.)
  const codeIndicators = [
    // Language keywords at line start
    /^(function|class|import\s|export\s|const\s|let\s|var\s|if\s*\(|else\b|for\s*\(|while\s*\(|return\b|try\b|catch\b|#include|package\s)/m,
    // Markup / config patterns that flood a block
    /^[.\s]*<[a-zA-Z_][^>]*\/?>\s*$/m,
    // Code-like assignment
    /^[a-zA-Z_$][\w$]*\s*=\s*function/m,
    // Typical line comment
    /^\s*\/\/\s/m,
  ];

  for (const pattern of codeIndicators) {
    if (pattern.test(text)) return false;
  }

  return arrowCount >= 2 || branchCount >= 1;
}

/**
 * Parse text flowchart and return Mermaid flowchart syntax string.
 */
export function parseTextFlowchart(text: string): string {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let nodeCounter = 0;

  function newNodeId(): string {
    nodeCounter++;
    return `N${nodeCounter}`;
  }

  function addNode(text: string): FlowNode {
    const node: FlowNode = {
      id: newNodeId(),
      text: sanitizeText(text),
      type: detectNodeType(text),
    };
    nodes.push(node);
    return node;
  }

  // ── Tokenize ─────────────────────────────────────────────────────

  const rawLines = text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());

  if (rawLines.length === 0) return "";

  // Normalize indentation (remove common leading whitespace)
  const minIndent = Math.min(
    ...rawLines.map((l) => (l.match(/^(\s*)/) ?? [""])[0].length)
  );
  const normalizedLines = rawLines.map((l) => l.slice(minIndent));

  interface Token {
    text: string;
    isBranch: boolean;
    branchLabel?: string;
    indent: number;
  }

  const tokens: Token[] = [];

  for (const line of normalizedLines) {
    const indent = (line.match(/^(\s*)/) ?? [""])[0].length;
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Branch token: |-- LABEL -> rest
    const branchMatch = trimmed.match(/^\|--\s*(\S+)\s*->\s*(.*)/);
    if (branchMatch) {
      // The branch might itself contain "->" chains — split further
      const restParts = splitByArrow(branchMatch[2].trim());
      tokens.push({
        text: restParts[0] || "",
        isBranch: true,
        branchLabel: branchMatch[1].trim(),
        indent,
      });
      // Remaining parts are continuation of this branch
      for (let j = 1; j < restParts.length; j++) {
        tokens.push({
          text: restParts[j].trim(),
          isBranch: false,
          branchLabel: undefined,
          indent: indent + 2, // treat as slightly deeper (child of branch)
        });
      }
      continue;
    }

    // Regular token: split by "->"
    const parts = splitByArrow(trimmed);
    for (const part of parts) {
      tokens.push({
        text: part.trim(),
        isBranch: false,
        indent,
      });
    }
  }

  if (tokens.length === 0) return "";

  // ── Build graph ──────────────────────────────────────────────────

  // Strategy:
  // - Walk tokens sequentially
  // - prevNode: the node before the current one in linear flow
  // - branchParent: the decision node we're currently branching from
  // - branchParentIndent: the indent level of that decision
  // - activeBranches: list of { terminalNode, indent } for each active branch
  //   (the last node created in each branch, so we can reconnect)

  let prevNode: FlowNode | null = null;
  let branchParent: FlowNode | null = null;
  let branchParentIndent = 0;
  const activeBranchTerminals: FlowNode[] = []; // last node of each branch
  let inBranches = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // ── Detect rejoin ────────────────────────────────────────────
    // A rejoin occurs when:
    // - We're inside branches (activeBranchTerminals.length > 0)
    // - Current token is NOT a branch
    // - Its indent <= branchParentIndent (back to decision level or above)
    if (inBranches && !tok.isBranch && activeBranchTerminals.length > 0) {
      if (tok.indent <= branchParentIndent) {
        // Rejoin! All active branches converge here.
        const rejoinNode = addNode(tok.text);

        // Connect each branch's terminal to the rejoin node
        for (const branchEnd of activeBranchTerminals) {
          edges.push({ from: branchEnd.id, to: rejoinNode.id });
        }

        activeBranchTerminals.length = 0;
        inBranches = false;
        branchParent = null;
        prevNode = rejoinNode;
        continue;
      }
    }

    // ── Regular (non-branch) token ────────────────────────────────
    if (!tok.isBranch) {
      const node = addNode(tok.text);

      // If we're inside branches, this extends the current branch
      if (inBranches && activeBranchTerminals.length > 0) {
        // Connect from the last branch terminal to this node
        const lastBranchEnd =
          activeBranchTerminals[activeBranchTerminals.length - 1];
        edges.push({ from: lastBranchEnd.id, to: node.id });
        // Update terminal
        activeBranchTerminals[activeBranchTerminals.length - 1] = node;
      }
      // Otherwise, normal linear flow
      else if (prevNode) {
        edges.push({ from: prevNode.id, to: node.id });
      }

      // If this is a decision, prepare for upcoming branches
      if (node.type === "decision") {
        branchParent = node;
        branchParentIndent = tok.indent;
        // Reset active branches; they'll be populated by upcoming |-- tokens
      } else {
        // If we're not in branches and this isn't a decision,
        // any previous branch context is fully resolved
        if (!inBranches) {
          branchParent = null;
          activeBranchTerminals.length = 0;
        }
      }

      prevNode = node;
      continue;
    }

    // ── Branch token (|--) ─────────────────────────────────────────
    if (tok.isBranch && branchParent) {
      const branchNode = addNode(tok.text);

      // Edge from decision to this branch
      edges.push({
        from: branchParent.id,
        to: branchNode.id,
        label: tok.branchLabel || "",
      });

      activeBranchTerminals.push(branchNode);
      prevNode = branchNode;
      inBranches = true;
      continue;
    }

    // Branch without a parent decision — treat as normal step
    if (tok.isBranch && !branchParent) {
      const node = addNode(
        (tok.branchLabel ? tok.branchLabel + ": " : "") + tok.text
      );
      if (prevNode) {
        edges.push({ from: prevNode.id, to: node.id });
      }
      prevNode = node;
    }
  }

  // ── Generate Mermaid ────────────────────────────────────────────
  return generateMermaidFlowchart(nodes, edges);
}

// ── helpers ────────────────────────────────────────────────────────

function sanitizeText(text: string): string {
  let s = text.replace(/^\[([^\]]+)\]$/, "$1");
  s = s.replace(/"/g, "#quot;");
  return s;
}

function detectNodeType(text: string): "terminal" | "process" | "decision" {
  const trimmed = text.trim();
  if (/^\[.+\]$/.test(trimmed)) return "terminal";
  if (trimmed.endsWith("?")) return "decision";
  return "process";
}

/**
 * Split a string by "->" but not inside double-quoted strings.
 */
function splitByArrow(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1] ?? "";

    if (ch === '"' && !inQuote) {
      inQuote = true;
      current += ch;
      continue;
    }
    if (ch === '"' && inQuote) {
      inQuote = false;
      current += ch;
      continue;
    }

    if (!inQuote && ch === "-" && next === ">") {
      if (current.trim()) parts.push(current.trim());
      current = "";
      i++; // skip >
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function generateMermaidFlowchart(
  nodes: FlowNode[],
  edges: FlowEdge[]
): string {
  const lines: string[] = ["flowchart TD", ""];

  // Node definitions
  for (const node of nodes) {
    switch (node.type) {
      case "terminal":
        lines.push(`    ${node.id}(["${node.text}"])`);
        break;
      case "decision":
        lines.push(`    ${node.id}{"${node.text}"}`);
        break;
      default:
        lines.push(`    ${node.id}["${node.text}"]`);
        break;
    }
  }

  lines.push("");

  // Edges
  for (const edge of edges) {
    if (edge.label) {
      lines.push(`    ${edge.from} -->|"${edge.label}"| ${edge.to}`);
    } else {
      lines.push(`    ${edge.from} --> ${edge.to}`);
    }
  }

  return lines.join("\n");
}
