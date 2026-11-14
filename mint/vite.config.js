import { fileURLToPath } from 'node:url';
export default {
  define: { global: 'globalThis' },
  resolve: { alias: { 'node-fetch': fileURLToPath(new URL('./src/shims/node-fetch.js', import.meta.url)) } },
  server: { port: 5173, host: '127.0.0.1' },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 2000 },
};
