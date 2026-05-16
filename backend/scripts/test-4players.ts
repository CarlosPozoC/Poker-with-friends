import { io, Socket } from 'socket.io-client';

const BASE = 'http://localhost:3001';

interface PlayerBot {
  name: string;
  userId: string;
  token: string;
  socket: Socket;
  playerId: string;
}

async function register(name: string): Promise<{ userId: string; token: string }> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: 'test123' }),
  });
  if (!res.ok) {
    // Try login if already exists
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: 'test123' }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
    const loginData = await loginRes.json();
    return { userId: loginData.user.id, token: loginData.token };
  }
  const data = await res.json();
  return { userId: data.user.id, token: data.token };
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/test-4players.ts <ROOM_CODE> [botCount=4]');
    console.log('Example: npx tsx scripts/test-4players.ts ABC12');
    console.log('\n1. Create a room in the browser (http://localhost:3000)');
    console.log('2. Note the room code');
    console.log('3. Run this script with that room code');
    console.log('4. The bots will join your room.\n');
    process.exit(0);
  }

  const ROOM = args[0].toUpperCase();
  const BOT_COUNT = Math.min(Math.max(parseInt(args[1]) || 4, 1), 5);
  const ALL_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];

  console.log(`Joining bots to room "${ROOM}"...\n`);

  const bots: PlayerBot[] = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const name = ALL_NAMES[i];
    const { userId, token } = await register(name);
    const socket = io(BASE, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      socket.on('connect', () => {
        console.log(`[+] ${name} connected`);
        socket.emit('join_room', { roomCode: ROOM, userId, userName: name });
        resolve();
      });
    });
    bots.push({ name, userId, token, socket, playerId: '' });
  }

  await wait(500);

  // Set up auto-play listeners
  for (const bot of bots) {
    bot.socket.on('game_state_update', (state: any) => {
      if (!bot.playerId) bot.playerId = state.myPlayerId;

      if (state.phase !== 'waiting' && state.phase !== 'showdown') {
        const isMyTurn = state.myPlayerId === state.currentPlayerId && state.availableActions.length > 0;
        if (isMyTurn) {
          const actions = state.availableActions;
          const call = state.callAmount;

          let action: any;
          if (actions.includes('check')) {
            action = { type: 'check' };
            console.log(`  [${bot.name}] CHECK`);
          } else if (actions.includes('call') && call <= 500) {
            action = { type: 'call' };
            console.log(`  [${bot.name}] CALL ${call}`);
          } else if (actions.includes('fold')) {
            action = { type: 'fold' };
            console.log(`  [${bot.name}] FOLD`);
          } else if (actions.includes('call')) {
            action = { type: 'call' };
            console.log(`  [${bot.name}] CALL ${call}`);
          } else {
            action = { type: 'fold' };
            console.log(`  [${bot.name}] FOLD`);
          }

          setTimeout(() => {
            bot.socket.emit('player_action', { roomCode: ROOM, action });
          }, 500 + Math.random() * 500);
        }
      }
    });

    bot.socket.on('hand_result', (data: any) => {
      console.log(`\n-- Hand Result --`);
      for (const w of data.winners) {
        const winner = bots.find((b) => b.playerId === w.playerId);
        console.log(`  ${winner?.name ?? '?'} wins ${w.winAmount} (${w.handName})`);
      }
      const boardCards = data.board?.map((c: any) => `${c.rank}${c.suit[0]}`).join(' ') ?? '';
      console.log(`  Board: ${boardCards}\n`);
    });
  }

  console.log(`\n${BOT_COUNT} bots waiting in room "${ROOM}".`);
  console.log('Open http://localhost:3000, join the same room, and start the game!');
  console.log('The bots will auto-play. Press Ctrl+C to stop.\n');

  // Keep alive
  await new Promise(() => {});
}

main().catch((e) => { console.error(e); process.exit(1); });