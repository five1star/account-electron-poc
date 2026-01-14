import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: false  // 포트가 사용 중이면 다른 포트 사용 허용
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
