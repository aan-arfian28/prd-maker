# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cd source_code

# Development (runs on port 3001, not default 3000)
npm run dev

# Production build (standalone output mode)
npm run build
npm start

# Type-check only (no emit)
npx tsc --noEmit

# Lint
npm run lint
```

## Architecture Overview

This is a Next.js 15 (App Router) single-page app that generates PRDs through AI pipelines. The app lives in `source_code/` — the repo root only holds docs, GitHub workflows, and the example PRD.

### PRD Generation: Two Modes

**Modular Pipeline** (`lib/prd-generator.ts`, 7 AI calls):
```
Stage 1: runAnalysis()        → JSON product analysis
Stage 2: runSectionGeneration() → 5 sequential calls, each seeing all prior output
  2a: Features
  2b: User Flows
  2c: Architecture (Mermaid sequenceDiagram)
  2d: Database (Mermaid erDiagram)
  2e: Technical Requirements
Stage 3: runAssembly()        → AI generates Overview + Design Constraints (JSON)
                                composeFinalPrd() programmatically concatenates everything
```

**Simple Mode** (`generatePrdSimple()`, single AI call):
- Uses the monolithic `SYSTEM_PROMPT_PRDMaker` prompt directly
- No chaining — one call produces the full PRD

Each stage resolves its system prompt via `getEffectivePrompt(key, customPrompts, lang)` — custom prompts (per-language, stored in localStorage) override defaults. Prompt placeholders like `{analysis}` are replaced with actual data in the generator, not in the prompt definition.

### Provider Abstraction (`lib/providers/`)

All AI providers implement the `AiProvider` interface (`types.ts`):
- `generateText(systemPrompt, userPrompt, apiKey, model)` — used by pipeline stages
- `generateStream(...)` — streaming variant
- `chatCompletion(messages, systemPrompt, apiKey, model)` — used by chat revision
- `fetchModels(apiKey)` — dynamic model list

Implementations:
- `openai-compatible.ts` — shared factory for OpenAI, DeepSeek, and Grok (all use the `openai` SDK)
- `gemini.ts` — Google Gemini via REST fetch
- `anthropic.ts` — Anthropic Claude via Messages API fetch

`registry.ts` resolves which provider/API-key/model to use: browser settings first, then env vars (`OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, etc.), with `DEFAULT_AI_PROVIDER` as fallback.

### Data Flow

1. `page.tsx` `handleGenerate` → `POST /api/generate-prd` (SSE streaming)
2. API route resolves provider → calls `generatePrdModular()` or `generatePrdSimple()`
3. Pipeline emits `PipelineProgress` events {step, status, message}
4. API wraps them as SSE `data:` events (`type:"progress"|"result"|"error"`)
5. Client parses the SSE stream, updates phase UI, sets PRD content on result

Chat revision follows the same SSE streaming pattern via `/api/chat-revision`.

### i18n (`lib/i18n.ts`)

Custom lightweight system — NOT next-intl. A single `TranslationMap` object with `{id, en}` pairs. `useLanguage()` hook provides `{t, toggleLang, lang}`. `tStatic()` for non-React contexts. The `Lang` type (`"id" | "en"`) threads through the entire pipeline (prompt selection, phase messages, generated PRD language).

Language preference is in `localStorage["ai-prd-maker-lang"]`.

### Client-Side Storage

- **IndexedDB** (`lib/prd-db.ts`) — PRD entries (`PrdEntry`: markdown, chat history, title, timestamps). DB name: `prd-maker-db`, store: `prds`. Indices on `createdAt` and `title`.
- **localStorage** — Settings (`ai-prd-maker-settings`), custom prompts per language (`ai-prd-maker-custom-prompts-{lang}`), user session ID (`prd-user-id`), language preference, storage warning dismissal.

All storage keys follow the `ai-prd-maker-*` or `prd-*` prefix convention.

### Component Tree

```
page.tsx
├── PromptInput          (textarea + example prompts + generation mode toggle)
├── SettingsModal        (provider, API key, model, test-connection, PromptEditor)
│   └── PromptEditor     (per-stage system prompt customization)
├── PrdViewer            (renders after PRD generated)
│   ├── MarkdownRenderer (react-markdown + Mermaid detection)
│   │   └── MermaidRenderer (mermaid.run() + fullscreen zoom)
│   └── ChatPanel        (floating chat for PRD revisions)
└── PrdHistory           (drawer listing saved PRDs from IndexedDB)
```

### Key Patterns

- **SSE streaming** for all AI generation — 15s heartbeat comments prevent proxy/browser timeout
- **Retry logic** — `generateWithRetry()` in prd-generator.ts does 2 retries with 1s delay, emitting progress events on retry
- **Prompt resolution chain** — custom localStorage → language-default prompt → hardcoded default. Custom prompts only store overrides (diff from default)
- **Context accumulation** — Stage 2 sections receive all previous section outputs (truncated to 50k chars via `truncateForContext()`)
- **Output mode** — `next.config.js` has `output: 'standalone'` for portable production deployment
- **No server-side storage** — everything is client-side (IndexedDB + localStorage)

### Tailwind Design Tokens

Custom `primary` color scale (indigo 50–950). Typography plugin configured with dark code blocks (slate-800 background) and light inline code (slate-100 background). No custom fonts — relies on system font stack.
