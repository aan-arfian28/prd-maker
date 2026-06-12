"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidRenderer from "./MermaidRenderer";
import { isTextFlowchart, parseTextFlowchart } from "@/lib/textFlowchartParser";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  let mermaidIndex = 0;

  return (
    <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:font-bold prose-h2:text-2xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-xl prose-h3:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-table:border prose-table:border-gray-200 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-a:text-indigo-600 prose-strong:text-gray-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeStr = String(children).replace(/\n$/, "");

            // Render Mermaid diagrams
            if (language === "mermaid") {
              const idx = mermaidIndex++;
              return <MermaidRenderer chart={codeStr} index={idx} />;
            }

            // Detect text-based flowcharts (no language, or text/flow/flowchart)
            const isFlowLang =
              !language || language === "text" || language === "flow" || language === "flowchart";
            if (isFlowLang && isTextFlowchart(codeStr)) {
              try {
                const mermaidSyntax = parseTextFlowchart(codeStr);
                if (mermaidSyntax) {
                  const idx = mermaidIndex++;
                  return <MermaidRenderer chart={mermaidSyntax} index={idx} />;
                }
              } catch {
                // If parsing fails, fall through to normal code block
              }
            }

            // Inline code
            if (!className) {
              return (
                <code
                  className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Code block
            return (
              <div className="my-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-700 px-4 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">
                    {language || "code"}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(codeStr)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                    title="Salin kode"
                  >
                    📋 Salin
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm leading-relaxed">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-50">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
                {children}
              </td>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b-2 border-indigo-500">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-200">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">
                {children}
              </h3>
            );
          },
          ol({ children, ...props }) {
            const start = (props as { start?: number }).start;
            return (
              <ol className="list-decimal pl-6 space-y-1 my-3" start={start}>
                {children}
              </ol>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-6 space-y-1 my-3">{children}</ul>
            );
          },
          li({ children }) {
            return <li className="text-gray-700 leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 my-4 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
