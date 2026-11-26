import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/drive/',
    plugins: [
      react(),
      tailwindcss(),
      // Dev-server middleware so both "/" (AI Studio Preview root) and "/drive/" render seamlessly
      {
        name: 'dual-base-dev-middleware',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && (req.url === '/' || req.url.startsWith('/?'))) {
              req.url = '/drive/' + req.url.slice(1);
            }
            next();
          });
        },
      },
      // Copies src/assets into dist/ AND mirrors dist/assets into dist/drive/assets
      // so both "/drive/assets/..." and "/assets/..." resolve in Vercel production deployments.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          // Mirror built assets under dist/drive/assets and dist/drive/index.html
          // so base: '/drive/' resolves physically whether accessed via subpath rewrite or direct root
          const builtAssets = path.resolve(distDir, 'assets');
          const driveDir = path.resolve(distDir, 'drive');
          const driveAssets = path.resolve(driveDir, 'assets');
          const builtIndex = path.resolve(distDir, 'index.html');
          if (fs.existsSync(builtAssets)) {
            fs.mkdirSync(driveDir, {recursive: true});
            fs.cpSync(builtAssets, driveAssets, {recursive: true, force: true});
          }
          if (fs.existsSync(builtIndex)) {
            fs.mkdirSync(driveDir, {recursive: true});
            fs.copyFileSync(builtIndex, path.resolve(driveDir, 'index.html'));
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
