// Keeps public/fonts/EBGaramond-*.woff byte-identical to the installed
// @fontsource/eb-garamond version. Runs automatically via the
// "postinstall" npm script -- both the on-screen resume preview (CSS
// @font-face) and the PDF export (react-pdf Font.register) load these
// from static /public paths, so they must always match whatever
// @fontsource/eb-garamond version is installed. WOFF (not WOFF2) is used
// deliberately: react-pdf's font subsetter is unreliable with WOFF2.
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(__dirname, "..", "node_modules", "@fontsource", "eb-garamond", "files");
const destDir = path.join(__dirname, "..", "public", "fonts");

const FILES = [
  ["eb-garamond-latin-400-normal.woff", "EBGaramond-Regular.woff"],
  ["eb-garamond-latin-500-normal.woff", "EBGaramond-Medium.woff"],
  ["eb-garamond-latin-600-normal.woff", "EBGaramond-SemiBold.woff"],
  ["eb-garamond-latin-700-normal.woff", "EBGaramond-Bold.woff"],
  ["eb-garamond-latin-400-italic.woff", "EBGaramond-Italic.woff"],
  ["eb-garamond-latin-700-italic.woff", "EBGaramond-BoldItalic.woff"],
];

if (!existsSync(sourceDir)) {
  console.warn("[sync-resume-fonts] @fontsource/eb-garamond not found -- skipping (is it installed?)");
} else {
  mkdirSync(destDir, { recursive: true });
  for (const [from, to] of FILES) {
    copyFileSync(path.join(sourceDir, from), path.join(destDir, to));
  }
  console.log(`[sync-resume-fonts] Copied ${FILES.length} EB Garamond files to public/fonts/`);
}
