# 🍃 ResuMint

Create ATS-friendly resumes in minutes. Privacy-first, no login, no ads, forever free!

## ✨ Features

- **ATS-Friendly Resume Templates**:
  - **Classic**: Traditional single-column serif typography (ideal for corporate, academia, finance, and legal roles).
  - **Modern**: Contemporary two-column sans-serif layout with dedicated sidebar and main body columns.
  - **Animated Template Switcher**: Sleek spring-animated toggle in the live preview toolbar with smooth micro-interactions.
- **Smart 1-Page Fit Mode**:
  - One-click "1-Page Fit" toggle calibrated to tighten vertical rhythm, margins, and typography so your content fits comfortably on a single physical page.
- **Dynamic Skill Category Management**:
  - Full CRUD control over skill groups: add custom categories (e.g. *Databases*, *DevOps*, *Soft Skills*), inline rename existing labels, reorder groups up/down, and delete categories with their tags.
- **Flexible Custom Sections (Up to 3 Slots)**:
  - Add up to three independent custom sections (*Publications*, *Volunteering*, *Hobbies*, etc.).
  - Reorderable up and down alongside standard sections.
  - **Modern Layout Placement**: Choose whether each custom section appears in the **Left Section (Sidebar)** or **Right Section (Main)** in the two-column Modern template.
- **Comprehensive Section Builder**:
  - Personal Details & Social Links (LinkedIn, GitHub, Portfolio)
  - Professional Summary (character-counter validated)
  - Education & Work Experience (with "Present / Currently Working" toggle)
  - Projects with live links and tech-stack tags
  - Certifications, Achievements, and Languages
  - Formal Declaration section (with Date, Place, and digital Signature preview)
- **Multi-Format Export & Import**:
  - **PDF Export**: Real, selectable ATS-safe text rendered client-side via `@react-pdf/renderer`.
  - **DOCX Export**: Clean Word document formatting using `docx`.
  - **JSON Resume Support**: Standard JSON Resume schema (v1.0.0) export and import.
  - **Plain Text Export**: Unformatted text ready to paste directly into job portal application fields.
  - **Client-Side Import**: Import existing resumes from PDF (`pdfjs-dist`) or DOCX (`mammoth`).
- **Privacy First & Local**:
  - 100% client-side. No accounts, no database, no telemetry, no analytics. Resume drafts persist securely in your browser's `localStorage`.
- **Global Undo / Redo**:
  - Desktop-grade keyboard shortcuts (`Ctrl+Z` / `Ctrl+Shift+Z` or `Cmd+Z` / `Cmd+Shift+Z`) with coalesced keystroke history.
- **PWA & Offline Capable**:
  - Installable Progressive Web App with dedicated offline service worker.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

`npm install` also runs a `postinstall` step that copies the PDF-parsing worker script into `public/` — this is expected, not an error.

## 🛠️ Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server (Turbopack) |
| `npm run build` | Optimized production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint check |

## 🧰 Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (CSS-native `@theme` tokens, see `app/globals.css`)
- **Animation:** Framer Motion (page transitions, spring pills, accordion reveals)
- **State Management:** React Context + hooks with local storage synchronization (see `components/resume-provider.tsx`)
- **PDF Generation:** `@react-pdf/renderer` (pure vector text, ATS-safe)
- **Word Document Generation:** `docx`
- **Resume Import Parsing:** `pdfjs-dist` (PDF) + `mammoth` (DOCX), client-side only
- **PWA Support:** Custom service worker (`public/sw.js`)

## 📂 Project Structure

```
app/                   Root layout, global styles, page route
components/
  ui/                  Reusable primitives (Button, Input, TagInput, Dialog, Accordion, ...)
  builder/             Resume Builder shell, sidebar, header, entry cards
  preview/             Live Resume Preview, ResumePaper, PreviewToolbar, PDF Document
  dialogs/             Download, Import, Clear, Template Switcher dialogs
  navigation/          Hero, Navbar, Footer, Theme Toggle
  sections/            Individual section editors (Personal, Education, Skills, Custom, ...)
hooks/                 useResume, useCompletion, useDownload, useDemoResume, useLocalStorage
utils/                 docxExport.ts, plainTextExport.ts, jsonResume.ts, resumeValidation.ts
constants/             resume-defaults.ts, demo-resume.ts, site copy
types/                 resume.ts, resume-store.ts, export.ts
public/                Icons, manifest.json, sw.js, pdf.worker.min.mjs
```

## 💡 Notable Design Decisions

- **Two Layout Paradigms**:
  - Classic single-column layout strictly follows time-tested academic and enterprise standards.
  - Modern two-column layout dynamically routes sidebar-oriented sections (Education, Skills, Languages, Certifications) and main-content sections (Experience, Projects, Summary, Declaration) while allowing custom sections to be placed on either column.
- **Dynamic Skill Categories**:
  - Rather than locking users to rigid hardcoded categories, the data model supports arbitrary user-defined categories with inline editing and drag/button reordering.
- **Dynamic Imports for Heavy Parsers**:
  - PDF rendering, DOCX building, and resume parsing dependencies are dynamically loaded only when export or import dialogs are triggered.
- **Dark & Light Mode**:
  - High-contrast, clean theme toggling without auto/system flicker.

## 🚀 Deployment

No backend or database configuration required — deploys seamlessly to Vercel, Netlify, or any static/Node host.

---

Built, Tested & Optimized with ❤️ by Team Udbhav.
