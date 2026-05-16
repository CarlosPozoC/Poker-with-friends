import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { config } from './config';

let agentProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;

const BIN = path.join(__dirname, '..', 'node_modules', 'ngrok', 'bin', 'ngrok.exe');
const URL_REGEX = /url=(\S+)/;

export function getNgrokUrl(): string | null {
  return tunnelUrl;
}

export async function startNgrokTunnel(port: number): Promise<string | null> {
  if (!config.ngrokEnabled) return null;

  console.log('[ngrok] Starting tunnel...');

  const args = ['http', String(port), '--log=stdout'];
  if (config.ngrokAuthToken) {
    args.push(`--authtoken=${config.ngrokAuthToken}`);
  }

  agentProcess = spawn(BIN, args, { windowsHide: true });

  return new Promise<string | null>((resolve) => {
    let started = false;

    agentProcess!.stdout!.on('data', (data: Buffer) => {
      const msg = data.toString();
      const match = msg.match(URL_REGEX);
      if (match && !started) {
        started = true;
        tunnelUrl = match[1].replace(/\/$/, '');
        console.log(`[ngrok] Public URL: ${tunnelUrl}`);
        resolve(tunnelUrl);
      }
    });

    agentProcess!.stderr!.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (!started) {
        console.warn(`[ngrok] ${msg.trim()}`);
      }
    });

    agentProcess!.on('error', (err) => {
      if (!started) {
        console.warn(`[ngrok] Process error: ${err.message}`);
        resolve(null);
      }
    });

    agentProcess!.on('exit', (code) => {
      if (!started) {
        console.warn(`[ngrok] Process exited with code ${code}`);
        resolve(null);
      }
      tunnelUrl = null;
      agentProcess = null;
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      if (!started) {
        console.warn('[ngrok] Timed out waiting for URL');
        if (agentProcess) agentProcess.kill();
        resolve(null);
      }
    }, 20000);
  });
}

export async function stopNgrokTunnel(): Promise<void> {
  tunnelUrl = null;
  if (agentProcess) {
    agentProcess.kill();
    agentProcess = null;
    console.log('[ngrok] Tunnel closed');
  }
}

export function registerShutdownHooks(): void {
  const cleanup = () => {
    if (agentProcess) {
      try { agentProcess.kill(); } catch {}
    }
  };
  process.once('SIGINT', () => { cleanup(); process.exit(0); });
  process.once('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('exit', cleanup);
}
