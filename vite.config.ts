import { defineConfig, Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetStub(): Plugin {
  return {
    name: 'figma-asset-stub',
    enforce: 'pre',
    resolveId(source) {
      if (source.startsWith('figma:asset/')) {
        return `\0${source}`;
      }
    },
    load(id) {
      if (id.startsWith('\0figma:asset/')) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='8' fill='%23e2e8f0'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%2394a3b8' font-family='sans-serif'>img</text></svg>`;
        return `export default "data:image/svg+xml,${svg}"`;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetStub(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
