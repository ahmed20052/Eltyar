
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'; // Added import

// https://vitejs.dev/config/

// Added to define __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  // !! هام جداً: استبدل <YOUR_REPOSITORY_NAME> باسم مستودعك على GitHub !!
  // مثال: إذا كان المستودع اسمه "my-study-app", يجب أن يكون السطر: base: '/my-study-app/',
  // إذا كنت ستنشر على 'username.github.io' مباشرة (مستودع اسمه 'username.github.io'), استخدم: base: '/',
  base: '/Eltyar/', 
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), // Now __dirname is correctly defined
    }
  },
  build: {
    outDir: 'dist', // Ensure output directory is 'dist' for gh-pages
    sourcemap: false, // Optional: disable sourcemaps for production to reduce build size
  }
})
