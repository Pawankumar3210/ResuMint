// Keeps public/pdf.worker.min.mjs byte-identical to the installed
// pdfjs-dist version. Runs automatically via the "postinstall" npm
// script -- resumeParser.ts loads this worker from a static /public
// path (more reliable under Turbopack than a bundler-relative URL),
// so it must always match whatever pdfjs-dist version is installed.
import { copyFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destination = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (existsSync(source)) {
  copyFileSync(source, destination);
  console.log("[sync-pdf-worker] Copied pdf.worker.min.mjs to public/");
} else {
  console.warn("[sync-pdf-worker] pdfjs-dist worker not found -- skipping (is pdfjs-dist installed?)");
}
