import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
  console.log('🚀 Building YouTube Unchained browser extension...');

  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');

  // Step 1: Build Popup and Options UI
  console.log('📦 Step 1: Bundling Popup & Options UI (React)...');
  await build({
    root: rootDir,
    base: './',
    configFile: false,
    plugins: [react()],
    publicDir: path.resolve(rootDir, 'public'),
    build: {
      outDir: distDir,
      emptyOutDir: true,
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: path.resolve(rootDir, 'popup.html'),
          options: path.resolve(rootDir, 'options.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // Step 2: Build Content Script as standalone IIFE (no imports)
  console.log('⚡ Step 2: Bundling Content Script (Standalone IIFE)...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/index.ts'),
        name: 'YouTubeUnchainedContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // Step 3: Build Background Script as ES module
  console.log('⚙️ Step 3: Bundling Background Service Worker...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // Ensure manifest.json and icons are in dist
  const manifestSrc = path.resolve(rootDir, 'public/manifest.json');
  const manifestDist = path.resolve(distDir, 'manifest.json');
  if (fs.existsSync(manifestSrc) && !fs.existsSync(manifestDist)) {
    fs.copyFileSync(manifestSrc, manifestDist);
  }

  console.log('✅ YouTube Unchained build completed successfully in dist/ !');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
