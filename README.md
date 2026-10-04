<div align="center">

# ⚡ ZERO_RADIUS

**Visual Blast Radius Simulator for Terraform Infrastructure**

*Edit Terraform → See your cloud architecture → Simulate change impact → Auto-fix with AI*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-4285F4?logo=google)](https://aistudio.google.com/)

---

<img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">

</div>

## What is ZeroRadius?

ZeroRadius is an interactive web-based console that lets you **write or upload Terraform code**, instantly **visualize** it as a live cloud architecture topology graph, **simulate the blast radius** of infrastructure changes, and **auto-remediate** cascading failure risks using Google Gemini AI.

Think of it as **"What happens if I change this?"** for your cloud infrastructure — before you `terraform apply`.

### Key Features

| Feature | Description |
|---|---|
| 🖊️ **Live Terraform Editor** | Monaco-powered HCL editor with syntax highlighting, copy, download, and upload support |
| 🗺️ **Architecture Canvas** | Interactive React Flow graph with animated traffic edges, protocol labels, and resource inspection |
| 💥 **Blast Radius Simulation** | Modify HCL code, then simulate — see which resources break and cascading failure depth via BFS |
| 🤖 **AI Remediation** | One-click Gemini-powered fix generation with side-by-side diff viewer and apply |
| 📦 **Preset Architectures** | Load pre-built stacks (Basic Cloud, Web+DB, Enterprise Mesh) in one click |
| 🎨 **AWS Console Theme** | Styled after the AWS Management Console for a familiar operations experience |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18.x ([download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn** / **pnpm**
- **Google Gemini API Key** — free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) *(required only for AI Remediation feature)*

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/zeroradius.git
cd zeroradius
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local and add your Gemini API key
# GEMINI_API_KEY=your_actual_key_here
```

> [!NOTE]
> The app works fully without an API key — the editor, canvas, and blast radius simulation all function offline. The API key is only needed for the **AI Auto-Fix** feature.

### 4. Start the development server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Build for production (optional)

```bash
npm run build
npm start
```

---

## Usage Walkthrough

1. **Edit or Upload** — Write Terraform HCL in the left-pane editor, or drag-and-drop a `.tf` file, or select a preset architecture
2. **Visualize** — The right-pane canvas auto-generates an interactive topology graph from your code
3. **Modify** — Change a resource in the editor (e.g. downsize a database, remove a cache)
4. **Simulate** — Click **"Simulate Change"** to run the blast radius analysis
5. **Review** — See epicenter nodes (orange) and downstream at-risk nodes (red) with risk level, cascade depth, and cost multiplier
6. **Auto-Fix** — Click **"Auto-Fix Risks"** to generate AI-powered remediation with a diff viewer
7. **Apply** — Review the fix, then apply it back to the editor with one click

---

## Project Structure

```
zeroradius/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Root page
│   │   ├── layout.tsx               # HTML layout + fonts
│   │   ├── globals.css              # Tailwind + AWS theme + animations
│   │   └── api/
│   │       ├── parse-terraform/     # HCL → React Flow graph API
│   │       └── ai-remediate/        # Gemini AI remediation API
│   ├── components/
│   │   ├── canvas/                  # React Flow graph components
│   │   │   ├── ArchitectureCanvas   # Main canvas + toolbar
│   │   │   ├── BlastRadiusOverlay   # Risk summary card
│   │   │   ├── RemediationPanel     # AI fix modal + diff viewer
│   │   │   ├── NodeInspectorDrawer  # Resource detail drawer
│   │   │   ├── nodes/CloudNode      # Custom node component
│   │   │   └── edges/HackerEdge     # Custom animated edge
│   │   ├── dashboard/
│   │   │   ├── Header               # AWS-style nav bar
│   │   │   └── SplitDashboard       # Resizable dual-pane layout
│   │   └── editor/
│   │       ├── TerraformEditor      # Monaco HCL editor
│   │       └── TerraformUploadZone  # File upload + presets
│   ├── data/
│   │   └── defaultTerraform.ts      # Seed HCL, presets, initial nodes
│   ├── lib/
│   │   ├── blastRadiusSimulator.ts  # BFS blast radius engine
│   │   └── terraformTransformer.ts  # HCL → graph transformer
│   └── types/
│       └── cloud-architecture.ts    # TypeScript interfaces
├── public/                          # Static assets
├── .env.example                     # Environment variable template
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind / postcss configs
└── OVERVIEW.md                      # Technical deep-dive
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | For AI features | — | Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)) |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Override the Gemini model used for remediation |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload on `localhost:3000` |
| `npm run build` | Create optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint checks |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript 5 (strict mode) |
| Graph Viz | React Flow (reactflow v11 / @xyflow/react v12) |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| IaC Parser | @evops/hcl-terraform-parser |
| AI | Google Gemini API (@google/generative-ai) |
| Icons | Lucide React |

> For a deep technical overview including algorithms, architecture diagrams, and theory, see **[OVERVIEW.md](./OVERVIEW.md)**.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ☕ and Terraform anxiety**

</div>
