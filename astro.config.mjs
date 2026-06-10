import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://famtastichosting.com',
  // 'hybrid' keeps marketing pages as static HTML, but lets API routes
  // and dashboard pages run server-side. Add export const prerender = true
  // to any page that should remain fully static.
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte()],
});
