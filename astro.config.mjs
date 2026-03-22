// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  outDir: './dist',
  site: 'https://app.snaix.homes',

  vite: {
    plugins: [tailwindcss()],
  },
});