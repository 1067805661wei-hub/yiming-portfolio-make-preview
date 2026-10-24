import { defineConfig } from 'vite';

const port = Number.parseInt(process.env.PORT || '5173', 10);
export default defineConfig({
  server: { host: '0.0.0.0', port, strictPort: true },
  preview: { host: '0.0.0.0', port, strictPort: true },
});
