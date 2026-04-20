import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function killStaleRequests() {
  return {
    name: 'kill-stale-requests',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';
        const isRogueRequest = 
          url.includes('workbox-') || 
          url.includes('@vite-plugin-pwa') || 
          url.includes('/src/main.tsx') ||
          (url.includes('@react-refresh') && !req.headers.accept?.includes('text/html'));
          
        if (isRogueRequest) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end('');
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), killStaleRequests()],
});
