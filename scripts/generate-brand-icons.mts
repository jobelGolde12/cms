/**
 * Brand icon pipeline — SINGLE SOURCE OF TRUTH companion script.
 *
 * Reads the canonical brand asset (public/logo.png) and regenerates the
 * App Router file-convention icons in src/app/ so the browser tab, home-screen
 * shortcuts, and metadata all display the same brand mark automatically.
 *
 * Run whenever the brand asset changes:
 *   pnpm exec tsx scripts/generate-brand-icons.mts
 *
 * NOTE: this is the only build tool that references the asset path; all
 * runtime references must go through <Logo /> (see src/components/logo.tsx).
 */
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const CANONICAL_ASSET = fileURLToPath(new URL("../public/logo.png", import.meta.url));

const TARGETS = [
  // Browser tab favicon (Next auto-generates <link rel="icon"> from this file).
  { file: "src/app/icon.png", size: 256 },
  // Apple home-screen icon (auto-generates <link rel="apple-touch-icon">).
  { file: "src/app/apple-icon.png", size: 180 },
] as const;

for (const { file, size } of TARGETS) {
  await sharp(CANONICAL_ASSET)
    .resize(size, size, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(fileURLToPath(new URL(`../${file}`, import.meta.url)));
  console.log(`✓ generated ${file} (${size}×${size})`);
}
