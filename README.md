<div align="center">

<img src="public/logo.svg" alt="ResuMint logo" width="72" />

# ResuMint

**Create ATS-friendly resumes in minutes.**  
Privacy-first · No login · No ads · Forever free.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Features

### 🎨 Resume Templates & Appearance

| Feature | Details |
|---|---|
| **Classic Template** | Single-column serif layout — ideal for corporate, academic, finance, and legal roles |
| **Modern Template** | Two-column sans-serif layout with a dedicated sidebar and main-content area |
| **Animated Template Switcher** | Spring-animated toggle in the preview toolbar with smooth Framer Motion micro-interactions |
| **ATS-Safe Font Picker** | Per-template font selection with live preview badges — font applies instantly across the resume |
| **Line Density Slider** | Granular vertical-rhythm control: **Compact**, **Standard**, or **Relaxed** — complementing export formats |

**Classic fonts** (serif, ATS-safe):
> EB Garamond · Merriweather · Times New Roman · Lora

**Modern fonts** (sans-serif, ATS-safe):
> Inter · Geist Sans · Roboto · Open Sans

---

### 📝 Resume Builder

- **Comprehensive Section Support** — Personal Details & Social Links (LinkedIn, GitHub, Portfolio), Professional Summary (character-counter validated), Education & Work Experience (with *Currently Working* toggle), Projects with live links and tech-stack tags, Certifications, Achievements, Languages, and a formal Declaration section with date, place, and digital signature preview.
- **Dynamic Skill Category Management** — Full CRUD over skill groups: add custom categories (e.g. *Databases*, *DevOps*, *Soft Skills*), inline-rename labels, reorder up/down, and delete with their tags.
- **Flexible Custom Sections (Up to 3)** — Add up to three independent custom sections (*Publications*, *Volunteering*, *Hobbies*, etc.). Fully reorderable alongside standard sections. In the Modern template, choose whether each lives in the **Sidebar** or the **Main** column.
- **Action-Verb Suggestions** — Curated verb bank to strengthen bullet points.
- **Resume Completion Meter** — Weighted progress indicator that scores each section against ATS best practices.
- **Resume Health Checks** — Real-time diagnostics surfacing missing fields, weak language, and formatting issues.

---

### 📤 Export & Import

| Format | Details |
|---|---|
| **PDF** | Real, selectable, ATS-safe vector text via `@react-pdf/renderer` — not a screenshot |
| **DOCX** | Clean Word document via `docx`, respects chosen font and density |
| **LaTeX (.tex)** | Overleaf-compatible `.tex` output, compiles with standard pdfLaTeX — zero extra dependencies |
| **JSON Resume** | Standard JSON Resume schema v1.0.0 export and re-import |
| **Plain Text** | Unformatted text, ready to paste into job portal application fields |
| **Import (PDF / DOCX)** | Parse and auto-populate the builder from an existing PDF (`pdfjs-dist`) or DOCX (`mammoth`) — 100% client-side |

---

### 🔗 Shareable Links (Zero-Backend)

Share your resume with anyone — no account, no server, no database:

1. Click **Share** in the preview toolbar (or run `Share Resume Link` from the Command Palette).
2. ResuMint compresses your entire resume into a URL-safe hash using **lz-string** (`#data=…`).
3. Paste the link. The recipient opens it and your resume loads instantly, read-only.

```
https://resumint.app/#data=N4IgxgpgLg...
```

---

### 📱 Mobile Support

- **Full-Screen Preview Modal** — A *Full Screen* button on mobile opens an edge-to-edge, unobstructed resume view with native swipe-to-dismiss.
- Fully responsive builder UI from 320 px upwards.

---

### ⌨️ Keyboard Shortcuts & Command Palette

Open the **Command Palette** (`Ctrl/Cmd + K`) for instant access to every action:

| Command | Action |
|---|---|
| `Ctrl/Cmd + K` | Open Command Palette |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| **Command Palette** | Download, Import, Switch Template, Share Link, Set Line Density, Load Demo, Clear Resume, Toggle Theme, Jump to any section |

---

### 🔒 Privacy-First & Local

- **100% client-side.** No accounts, no database, no telemetry, no analytics.
- Resume data lives exclusively in your browser's `localStorage`.
- All export and import processing happens entirely in your browser — nothing is ever uploaded.

---

### 🌐 PWA & Offline

- Installable as a Progressive Web App (PWA) on desktop and mobile.
- Offline-capable via a custom service worker (`public/sw.js`).

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** `npm install` runs a `postinstall` step that copies the PDF-parsing worker script into `public/`. This is expected and not an error.

---

## 🛠️ Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server with Turbopack HMR |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across the entire project |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) + TypeScript (strict mode) |
| **UI** | [Tailwind CSS v4](https://tailwindcss.com) — CSS-native `@theme` tokens |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) — spring transitions, accordion reveals, micro-interactions |
| **State** | React Context + hooks with `localStorage` synchronization |
| **PDF Export** | [`@react-pdf/renderer`](https://react-pdf.org) — pure vector text, ATS-safe |
| **DOCX Export** | [`docx`](https://docx.js.org) |
| **LaTeX Export** | Custom generator (`utils/latexExport.ts`) — Overleaf-compatible |
| **URL Sharing** | [`lz-string`](https://pieroxy.net/blog/pages/lz-string/index.html) — compress resume JSON into a URL hash |
| **PDF Import** | [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) |
| **DOCX Import** | [`mammoth`](https://github.com/mwilliamson/mammoth.js) |
| **Icons** | [`lucide-react`](https://lucide.dev) |
| **PWA** | Custom service worker (`public/sw.js`) |
| **Fonts** | Google Fonts (EB Garamond, Merriweather, Lora, Inter, Roboto, Open Sans) + Geist Sans |

---

## 📂 Project Structure

```
app/
  layout.tsx              Root layout — font preloads, metadata
  globals.css             Tailwind v4 @theme tokens, Google Fonts @import
  page.tsx                Landing page + builder entry point

components/
  resume-provider.tsx     Global resume state (Context + actions + undo/redo)
  command-palette.tsx     ⌘K command palette with all actions
  shared-resume-loader.tsx Detects #data= hash and auto-loads shared resumes
  builder/                Builder shell, sidebar, header, entry cards
  preview/
    resume-paper.tsx      Live preview canvas (applies font + density)
    resume-pdf-document.tsx @react-pdf/renderer PDF document
    preview-toolbar.tsx   Template switcher, font picker, density, share, zoom
    mobile-preview-modal.tsx Full-screen modal with swipe-to-dismiss
  dialogs/
    download-dialog.tsx   Export hub: PDF, DOCX, LaTeX, JSON, Plain Text
    import-dialog.tsx     Import from PDF or DOCX
  sections/               Individual section editors (Personal, Education, …)
  navigation/             Hero, Navbar, Footer, Theme Toggle
  ui/                     Reusable primitives (Button, Input, TagInput, …)

hooks/
  use-resume.ts           Resume state accessor
  use-download.ts         Export orchestration (PDF, DOCX, formats)
  use-import-resume.ts    Import parsing pipeline
  use-completion.ts       Resume completion score
  use-resume-health.ts    Real-time health diagnostics
  use-demo-resume.ts      Load/clear demo resume (preserves appearance prefs)
  use-keyboard-shortcuts.ts Global shortcut bindings
  use-pwa-install.ts      PWA install prompt

utils/
  latexExport.ts          LaTeX (.tex) generator — Overleaf-compatible
  docxExport.ts           DOCX generator (font + density aware)
  plainTextExport.ts      Plain text serializer
  jsonResume.ts           JSON Resume schema v1.0.0 export/import
  shareResume.ts          lz-string hash encode/decode for shareable URLs
  resumeParser.ts         PDF + DOCX text extraction + field mapping
  resumeValidation.ts     Zod-based schema validation

constants/
  resume-defaults.ts      Default resume state, CLASSIC_FONTS, MODERN_FONTS, DENSITY_OPTIONS
  demo-resume.ts          Fully populated demo resume fixture
  site.ts                 Site metadata (title, description, URL)

types/
  resume.ts               Core Resume type, ClassicFont, ModernFont, ResumeDensity
  export.ts               ExportFormat union type
  resume-store.ts         Provider state shape

public/
  manifest.json           PWA manifest
  sw.js                   Service worker (offline cache)
  pdf.worker.min.mjs      pdfjs-dist worker (copied by postinstall)
  fonts/                  Locally hosted fallback fonts
```

---

## 💡 Notable Design Decisions

### Two Layout Paradigms
- **Classic** strictly follows time-tested single-column academic and enterprise standards.
- **Modern** dynamically routes sidebar-oriented sections (Education, Skills, Languages, Certifications) and main-content sections (Experience, Projects, Summary, Declaration) while letting custom sections be placed on either column.

### Font Strategy
Fonts are applied as an inline `style={{ fontFamily }}` on the resume `<article>` element — not via Tailwind utility classes, which would override inline styles. This ensures the user's chosen font renders correctly in both the live preview and exported PDF/DOCX.

### Line Density
Density is a first-class data field (`"compact" | "standard" | "relaxed"`) stored in the resume object. `resume-paper.tsx` reads it to adjust margins and line spacing live; `docxExport.ts` respects it in DOCX paragraph spacing.

### Zero-Backend Sharing
The entire resume is JSON-serialized, compressed with `lz-string`, and stored in the URL hash (`#data=…`). No data ever touches a server. The `SharedResumeLoader` component uses `useSyncExternalStore` to reactively detect hash changes without calling `setState` inside `useEffect`.

### Dynamic Imports for Heavy Dependencies
PDF rendering (`@react-pdf/renderer`), DOCX building (`docx`), and resume parsing (`pdfjs-dist`, `mammoth`) are dynamically imported only when their respective dialogs are opened — keeping the initial bundle lean.

### Privacy & Offline First
All logic runs in the browser. `localStorage` is the only persistence layer. The service worker caches assets for full offline capability.

---

## 🚀 Deployment

No backend or database configuration needed — deploys seamlessly to **Vercel**, **Netlify**, or any static / Node.js host.

```bash
# Vercel (recommended)
vercel deploy

# Netlify
netlify deploy --prod

# Self-hosted Node.js
npm run build && npm run start
```

---

## 🤝 Contributing

1. Fork the repo and create your feature branch: `git checkout -b feat/my-feature`
2. Make your changes and ensure all checks pass:
   ```bash
   npx tsc --noEmit   # TypeScript
   npm run lint        # ESLint
   npm run build       # Production build
   ```
3. Commit with a conventional commit message: `git commit -m "feat: add my feature"`
4. Push and open a Pull Request.

---

<div align="center">

Built, Tested & Optimized with ❤️ by **Team Udbhav**

</div>
