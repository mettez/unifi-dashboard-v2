import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let target = env.VITE_UNIFI_CONTROLLER_URL || 'https://192.168.1.1';
  if (!target.startsWith('http')) {
    target = `https://${target}`;
  }

  // Ensure no trailing slash for consistency
  if (target.endsWith('/')) {
    target = target.slice(0, -1);
  }

  console.log('Proxying API requests to:', target);

  const proxyConfig = {
    target: 'http://localhost:3001', // Use our dedicated proxy
    changeOrigin: true,
    secure: false,
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': proxyConfig,
        '/proxy': proxyConfig
      }
    }
  }
})
