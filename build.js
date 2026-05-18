import esbuild from 'esbuild';
import process from 'process';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

const contentConfig = {
  entryPoints: ['extension/content/content.js'],
  bundle: true,
  outfile: 'extension/dist/content.js',
  format: 'iife', // Isolated world content script execution
  target: ['chrome100'],
  logLevel: 'info',
};

const backgroundConfig = {
  entryPoints: ['extension/background/background.js'],
  bundle: true,
  outfile: 'extension/dist/background.js',
  format: 'esm', // Modern ES Module service worker support in MV3
  target: ['chrome100'],
  logLevel: 'info',
};

const offscreenConfig = {
  entryPoints: ['extension/offscreen/offscreen.js'],
  bundle: true,
  outfile: 'extension/dist/offscreen.js',
  format: 'esm', // Modern ES Module support in HTML pages
  target: ['chrome100'],
  logLevel: 'info',
};

async function run() {
  // Ensure the extension/dist/ folder exists
  if (!fs.existsSync('extension/dist')) {
    fs.mkdirSync('extension/dist', { recursive: true });
  }

  // Copy ONNX WebAssembly compiler files from transformers package to extension/dist/
  console.log('Copying ONNX WebAssembly assets to dist...');
  const wasmSourceDir = 'node_modules/onnxruntime-web/dist';
  const wasmDestDir = 'extension/dist';
  
  if (fs.existsSync(wasmSourceDir)) {
    const files = fs.readdirSync(wasmSourceDir);
    let copiedCount = 0;
    for (const file of files) {
      if (file.endsWith('.wasm') || (file.startsWith('ort-wasm') && file.endsWith('.mjs'))) {
        fs.copyFileSync(
          path.join(wasmSourceDir, file),
          path.join(wasmDestDir, file)
        );
        copiedCount++;
      }
    }
    console.log(`✨ Successfully copied ${copiedCount} ONNX WebAssembly & JS helper files.`);
  } else {
    console.warn(`⚠️ Warning: WASM source folder not found at ${wasmSourceDir}`);
  }

  if (isWatch) {
    console.log('Starting PromptRoute watch compiler...');
    const contentCtx = await esbuild.context(contentConfig);
    const backgroundCtx = await esbuild.context(backgroundConfig);
    const offscreenCtx = await esbuild.context(offscreenConfig);
    
    await contentCtx.watch();
    await backgroundCtx.watch();
    await offscreenCtx.watch();
    
    console.log('Watching for changes in extension/ files...');
  } else {
    console.log('Building PromptRoute bundles...');
    
    await esbuild.build(contentConfig);
    await esbuild.build(backgroundConfig);
    await esbuild.build(offscreenConfig);
    
    console.log('✨ Bundling completed successfully!');
  }
}

run().catch((err) => {
  console.error('❌ Compilation failed:', err);
  process.exit(1);
});
