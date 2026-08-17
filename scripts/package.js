/**
 * Packaging script: copies the built dist/ into release/chrome/ and
 * release/edge/ and creates ZIP files for store submission.
 */

import { execSync } from 'child_process';
import { mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');

const browser = process.argv[2];
if (!browser || (browser !== 'chrome' && browser !== 'edge')) {
  console.error('Usage: node scripts/package.js <chrome|edge>');
  process.exit(1);
}

const targetDir = join(releaseDir, browser);
mkdirSync(targetDir, { recursive: true });

// Copy dist/ into target
copyDir(distDir, targetDir);

// Create ZIP using native zip utility
const zipPath = join(releaseDir, `${browser}-extension.zip`);
try {
  execSync(`cd "${targetDir}" && zip -r -9 "${zipPath}" ./*`, { stdio: 'inherit' });
  console.log(`Created ${zipPath}`);
} catch (err) {
  console.error('Failed to create ZIP package:', err);
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
