import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'noise.svg'],
        manifest: {
          name: 'Synapse | Neural Dashboard',
          short_name: 'Synapse',
          description: 'High-performance neural dashboard for personal execution and financial auditing.',
          theme_color: '#0c0d10',
          background_color: '#0c0d10',
          display: 'standalone',
          icons: [
            {
              src: '/favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'motion/react'],
            'vendor-ui': ['sonner'],
            'vendor-charts': ['recharts'],
            'vendor-date': ['date-fns'],
            'vendor-firebase-core': ['firebase/app'],
            'vendor-firebase-auth': ['firebase/auth'],
            'vendor-firebase-db': ['firebase/firestore'],
            'vendor-firebase-storage': ['firebase/storage'],
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
