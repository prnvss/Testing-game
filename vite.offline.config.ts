import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

/**
 * Builds the OSCE Clinic as ONE self-contained HTML file (offline/OSCE-Clinic.html): scripts, styles and fonts are
 * inlined, so it opens by double-clicking — no server or internet needed.
 */
function singleFile(name: string): Plugin {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find(f => f.type === 'asset' && f.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset') return;
      let src = String(html.source);
      for (const [file, out] of Object.entries(bundle)) {
        if (out.type === 'chunk' && out.isEntry) {
          const code = out.code.replace(/<\/script/gi, '<\\/script');
          src = src.replace(new RegExp(`<script[^>]*src="[./]*${file}"[^>]*></script>`), () => `<script type="module">${code}</script>`);
          delete bundle[file];
        } else if (out.type === 'asset' && file.endsWith('.css')) {
          // Drop the theme's Google Fonts import — the fonts are bundled (src/osce/fonts).
          const css = String(out.source).replace(/@import\s*(?:url\()?\s*(["'])https:\/\/fonts\.googleapis\.com.*?\1\)?\s*;/g, '');
          src = src.replace(new RegExp(`<link[^>]*href="[./]*${file}"[^>]*>`), () => `<style>${css}</style>`);
          delete bundle[file];
        }
      }
      html.source = src;
      html.fileName = name;
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), singleFile('OSCE-Clinic.html')],
  build: {
    outDir: 'offline',
    emptyOutDir: true,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {input: 'osce.html', output: {codeSplitting: false}},
  },
});
