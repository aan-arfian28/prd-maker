# AI PRD Maker

> AI-powered Product Requirements Document generator with Mermaid diagrams, chat revision, and DeepSeek AI.

Generate professional, detailed PRDs (500+ lines) simply by describing your app idea. Built with **Next.js 15**, **React 19**, and **DeepSeek AI**.

## Features

- **AI-Generated PRDs** — Describe your app in natural language and get a comprehensive, professionally structured Product Requirements Document in seconds.
- **Mermaid Diagrams** — Every PRD includes at least two diagrams: a sequence diagram for system architecture and an ER diagram for the database schema (both rendered inline).
- **Chat Revision** — Refine your PRD through an interactive chat interface — discuss changes with the AI and see the document update in real time.
- **Markdown Rendering** — PRDs are rendered as rich, formatted documents with tables, headings, code blocks, and diagrams.
- **PRD History** — Save generated PRDs locally for later reference, reload, or delete them.
- **Model Selection** — Choose between `deepseek-chat` and `deepseek-reasoner` models.
- **Configurable API Key** — Bring your own DeepSeek API key (stored in browser localStorage) or set it server-side via environment variable.
- **Example Prompts** — Quick-start with built-in example prompts for common app types.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| AI Provider | DeepSeek API (via OpenAI-compatible client) |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Diagrams | Mermaid 11 |
| Runtime | Node.js |

## Project Structure

```
ai-prd-maker/
├── source_code/
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── generate-prd/route.ts    # PRD generation endpoint
│       │   │   ├── chat-revision/route.ts   # Chat-based PRD revision
│       │   │   ├── save-prd/route.ts        # Save PRD to disk
│       │   │   ├── load-prd/route.ts        # Load saved PRD
│       │   │   ├── delete-prd/route.ts      # Delete saved PRD
│       │   │   └── list-models/route.ts     # List available models
│       │   ├── layout.tsx
│       │   └── page.tsx                     # Main page
│       ├── components/
│       │   ├── PromptInput.tsx              # PRD prompt input with examples
│       │   ├── PrdViewer.tsx                # Markdown + diagram viewer
│       │   ├── ChatPanel.tsx                # Chat revision panel
│       │   ├── PrdHistory.tsx               # Saved PRDs list
│       │   └── SettingsModal.tsx            # API key & model settings
│       └── lib/
│           ├── deepseek.ts                  # DeepSeek API client & prompts
│           ├── modelList.ts                 # Model fetching & fallback list
│           ├── types.ts                     # Shared TypeScript types
│           └── textFlowchartParser.ts       # Text-to-Mermaid flowchart parser
└── contoh_prd.md                            # Example generated PRD output
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **DeepSeek API key** — Get one at [platform.deepseek.com](https://platform.deepseek.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/Arfith/ai-prd-maker.git
cd ai-prd-maker/source_code

# Install dependencies
npm install

# Set up environment (optional — can also set API key in the browser UI)
cp .env.example .env.local
# Edit .env.local and add your DEEPSEEK_API_KEY
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Configuration

The app supports two ways to configure the DeepSeek API key:

1. **Browser UI** — Click the gear icon (⚙️) in the header to open Settings and enter your API key. Stored in `localStorage`.
2. **Environment Variable** — Set `DEEPSEEK_API_KEY` in `.env.local`:

```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

> Browser-provided keys take precedence over environment variables.

Optionally, set a default model:

```bash
DEEPSEEK_MODEL=deepseek-chat
```

## How It Works

1. **Enter a prompt** — Describe the app you want to build (in Indonesian). Example prompts are provided.
2. **AI generates PRD** — The DeepSeek API generates a comprehensive PRD with:
   - Overview & problem statement
   - High-level requirements
   - Core features with detailed descriptions
   - User flow steps
   - System architecture (Mermaid sequence diagram)
   - Database schema (Mermaid ER diagram)
   - Design & technical constraints
3. **View & interact** — The PRD is rendered as rich Markdown with inline Mermaid diagrams.
4. **Chat to revise** — Open the chat panel to discuss changes with the AI. It updates the PRD while preserving existing content and diagrams.

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-prd` | POST | Generate a new PRD from a prompt |
| `/api/chat-revision` | POST | Revise PRD via chat conversation |
| `/api/save-prd` | POST | Save a PRD to disk |
| `/api/list-prds` | GET | List all saved PRDs |
| `/api/load-prd` | GET | Load a specific saved PRD |
| `/api/delete-prd` | DELETE | Delete a saved PRD |
| `/api/list-models` | POST | Fetch available DeepSeek models |

## License

MIT

---

Built with ❤️ using Next.js and DeepSeek AI.
