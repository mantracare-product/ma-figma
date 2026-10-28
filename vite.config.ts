import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function apiServerPlugin() {
  return {
    name: 'api-server-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/stt/transcribe') {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              ok: true,
              model: 'whisper-large-v3-turbo',
              hasKey: Boolean(process.env.GROQ_API_KEY),
            }));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                const reqBody = JSON.parse(body);
                const { handleWhisperTranscribeRequest } = await server.ssrLoadModule('./api/stt/transcribe.ts');
                const result = await handleWhisperTranscribeRequest(reqBody);
                res.statusCode = (result.error && !result.unconfigured) ? (result.upstreamStatus || 500) : 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Whisper STT failed', detail: String(err?.message || err) }));
              }
            });
            return;
          }
        }
        if (req.url === '/api/process/simulate-reply' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const reqBody = JSON.parse(body);
              const { handleSimulateStageReplyRequest } = await server.ssrLoadModule('./server/routes/simulateStageReply.ts');
              const result = await handleSimulateStageReplyRequest(reqBody);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Simulation failed', detail: String(err?.message || err) }));
            }
          });
          return;
        }
        if (req.url === '/api/onboarding/extract' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const reqBody = JSON.parse(body);
              const { handleOnboardingExtractRequest } = await server.ssrLoadModule('./api/onboarding/extract.ts');
              const result = await handleOnboardingExtractRequest(reqBody);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ unconfigured: true, error: String(err?.message || err) }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables from .env.local / .env for local server middleware
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }

  return {
    plugins: [
      figmaAssetResolver(),
      apiServerPlugin(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('mammoth') || id.includes('docx-preview') || id.includes('jszip') || id.includes('html2canvas')) {
                return 'vendor-docs-pdf';
              }
              if (id.includes('lucide-react') || id.includes('react-icons')) {
                return 'vendor-icons';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('@anthropic-ai')) {
                return 'vendor-ai';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('react')) {
                return 'vendor-react-core';
              }
            }
          },
        },
      },
    },
  };
});
