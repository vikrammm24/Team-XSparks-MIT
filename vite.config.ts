import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to treat the local filesystem as a direct backend for our SQLite db
const dbPlugin = () => ({
  name: 'sqlite-db-plugin',
  configureServer(server: any) {
    server.middlewares.use('/api/db', (req: any, res: any, next: any) => {
      const dbPath = path.resolve(__dirname, 'vikas.sqlite');
      
      if (req.method === 'GET') {
        if (fs.existsSync(dbPath)) {
          const data = fs.readFileSync(dbPath);
          res.setHeader('Content-Type', 'application/x-sqlite3');
          res.end(data);
        } else {
          res.statusCode = 404;
          res.end();
        }
      } else if (req.method === 'POST') {
        let body: any[] = [];
        req.on('data', (chunk: any) => body.push(chunk));
        req.on('end', () => {
          const buffer = Buffer.concat(body);
          fs.writeFileSync(dbPath, buffer);
          res.statusCode = 200;
          res.end();
        });
      } else {
        next();
      }
    });
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dbPlugin()],
  server: {
    watch: {
      ignored: ['**/.venv/**', '**/training_env/**'],
    },
  },
})
