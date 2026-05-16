import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from './config';
import { registerSocketHandlers } from './socket/handlers';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import prisma from './config/database';
import { startNgrokTunnel, registerShutdownHooks } from './ngrok';

const allowedOrigins = new Set<string>();

function addOrigin(url: string): void {
  allowedOrigins.add(url.replace(/\/$/, ''));
}

addOrigin(config.frontendUrl);

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/uploads', express.static(path.join(config.uploadsDir)));

app.use('/api/auth', authRouter);
app.use('/api/user', profileRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

registerSocketHandlers(io);
registerShutdownHooks();

const proxyMiddleware = createProxyMiddleware({
  target: config.frontendUrl,
  changeOrigin: true,
  ws: true,
  pathFilter: (pathname) =>
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/uploads') &&
    !pathname.startsWith('/socket.io'),
});

app.use(proxyMiddleware);
server.on('upgrade', proxyMiddleware.upgrade);

async function start() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to database');
  } catch {
    console.warn('[DB] Database not available, running without persistence');
  }

  server.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);

    startNgrokTunnel(config.port).then((url) => {
      if (url) {
        addOrigin(url);
        console.log('');
        console.log('  ╔════════════════════════════════════════════════╗');
        console.log('  ║  Public URL (share with friends!):             ║');
        console.log(`  ║  ${url.padEnd(48)}║`);
        console.log('  ╚════════════════════════════════════════════════╝');
        console.log('');
      }
    });
  });
}

start();
