# 🍃 ResuMint

Create ATS-friendly resumes in minutes. Privacy-first, no login, no ads, forever free.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm install` also runs a `postinstall` step that copies the PDF-parsing
worker script into `public/` — this is expected, not an error.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript, strict mode
- **Styling:** Tailwind CSS v4 (CSS-native `@theme` tokens, see `app/globals.css`)
- **Animation:** Framer Motion
- **State:** React Context + hooks (no Redux/Zustand) — see `components/resume-provider.tsx`
- **PDF export:** `@react-pdf/renderer` (real selectable text, not rasterized)
- **DOCX export:** `docx`
- **Resume import parsing:** `pdfjs-dist` (PDF) + `mammoth` (DOCX), both client-side only
- **PWA:** hand-written service worker (`public/sw.js`) — deliberately not `next-pwa`, which has known reliability issues under Turbopack

Everything runs client-side. No backend, no database, no analytics, no resume data ever leaves the browser.

## Project Structure

```
app/                   Root layout, global styles, the one page route
components/
  ui/                  Reusable primitives (Button, Input, Dialog, Accordion, ...)
  builder/              Resume Builder shell, sidebar, header
  preview/              Resume Preview, ResumePaper
  dialogs/              Download, Import, Success, Confirm dialogs
  navigation/            Hero, Navbar, Footer, Theme Toggle
  sections/              One folder per resume section (Personal, Education, ...)
hooks/                  useResume, useCompletion, useDownload, useImportResume, ...
utils/                  resumeCompletion.ts, pdfExport.tsx, docxExport.ts, resumeParser.ts
constants/              Site copy, resume defaults, demo resume data
types/                  Resume, SectionStatus, ExportFormat, ...
scripts/                postinstall (pdf worker sync), one-time icon generation, contrast audit
```

## Notable Design Decisions

- **Resume Completion** tracks "did you fill this in" per section, shown as a percentage in the builder sidebar.
- **Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)** operate on the resume as a whole, coalescing rapid typing into single steps — this matches how design tools like Figma/Notion handle undo, not native browser text-field undo.
- **PDF/DOCX generation libraries are dynamically imported**, not bundled into the initial page load — they're only fetched the moment someone clicks Download or Import.
- Only **Dark** and **Light** themes are offered (no "System" option), by design.

## Deployment

No server configuration required — deploys to Vercel (or any static/Node host) with zero setup.

---

Built, Tested & Optimized by Team Udbhav.
