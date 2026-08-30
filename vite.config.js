import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: "/contrex-reporting",
   plugins: [
    tailwindcss(),
    solid(),
  ],
  css: {
    devSourcemap: true,
  },
  server: {
    port: 5175
  }
});
