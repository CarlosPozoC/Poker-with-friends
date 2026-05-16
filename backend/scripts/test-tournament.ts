import { io } from 'socket.io-client';

const BASE = 'http://localhost:3001';

async function register(name: string) {
  const uniq = Date.now();
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `${name}${uniq}`, password: 'test123' }),
  });
  if (!res.ok) throw new Error(await res.text());
  const d = await res.json();
  return { userId: d.user.id, token: d.token };
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const ROOM = 'T' + Math.random().toString(36).slice(2, 5).toUpperCase();
  const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
  console.log(`Room: ${ROOM}\n`);

  const players: { name: string; socket: any; playerId: string; stack: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const name = NAMES[i];
    const { userId, token } = await register(name);
    const socket = io(BASE, { transports: ['websocket'] });
    await new Promise<void>(r => {
      socket.on('connect', () => {
        socket.emit('join_room', { roomCode: ROOM, userId, userName: name });
        r();
      });
    });
    players.push({ name, socket, playerId: '', stack: 10000 });
  }
  console.log('6 players connected.\n');
  await wait(300);

  let handCount = 0;
  let currentLevel = 0;

  // All bots act
  for (const p of players) {
    p.socket.on('game_state_update', (st: any) => {
      if (!p.playerId) p.playerId = st.myPlayerId;
      const me = st.players.find((x: any) => x.id === p.playerId);
      if (me) p.stack = me.stack;
      if (st.blindLevel && st.blindLevel !== currentLevel) {
        currentLevel = st.blindLevel;
        console.log(`  >> Level ${currentLevel}: ${st.smallBlind}/${st.bigBlind}`);
      }

      if (st.phase === 'waiting' || st.phase === 'showdown') return;
      if (st.myPlayerId !== st.currentPlayerId) return;
      if (!st.availableActions?.length) return;

      const actions = st.availableActions;
      const call = st.callAmount;
      const myStack = me?.stack ?? 0;
      const maxBet = (me?.currentBet ?? 0) + myStack;

      let action: any;
      const r = Math.random();

      if (actions.includes('check')) {
        action = r < 0.7 ? { type: 'check' }
          : (actions.includes('raise') && myStack > call + st.bigBlind * 3)
            ? { type: 'raise', amount: call + st.bigBlind * 3 + Math.floor(r * st.bigBlind * 2) }
            : { type: 'check' };
      } else if (actions.includes('call')) {
        const ratio = call / maxBet;
        if (ratio > 0.7) {
          action = r < 0.35 ? { type: 'fold' }
            : r < 0.7 ? { type: 'call' }
            : actions.includes('all-in') ? { type: 'all-in' }
            : { type: 'call' };
        } else if (actions.includes('raise') && r < 0.2 && myStack > call + st.bigBlind * 3) {
          action = { type: 'raise', amount: call + st.bigBlind * 4 + Math.floor(r * st.bigBlind * 2) };
        } else action = { type: 'call' };
      } else if (actions.includes('all-in')) action = { type: 'all-in' };
      else if (actions.includes('fold')) action = { type: 'fold' };

      if (action) {
        console.log(`    ${p.name} ${action.type}${action.amount ? ' ' + action.amount : ''}`);
        setTimeout(() => p.socket.emit('player_action', { roomCode: ROOM, action }), 200 + Math.random() * 300);
      }
    });
  }

  // Track hand results on bot[0]
  players[0].socket.on('hand_result', (data: any) => {
    handCount++;
    const w = data.winners.map((x: any) => {
      const b = players.find(p => p.playerId === x.playerId);
      return `${b?.name ?? '?'}(${x.handName})`;
    }).join(', ');
    const busted = players.filter(p => p.stack <= 0).map(p => p.name);
    console.log(`  #${handCount} | ${w}${busted.length ? ` OUT:${busted.join(',')}` : ''}`);
  });

  console.log('Starting game...\n');
  players[0].socket.emit('start_game', { roomCode: ROOM });

  // Monitor
  for (let t = 0; t < 300; t++) {
    await wait(2000);
    if (players.filter(p => p.stack > 0).length <= 1) break;
  }

  const total = players.reduce((s, p) => s + p.stack, 0);
  console.log(`\n=== DONE (${handCount} hands, level ${currentLevel}) ===`);
  players.sort((a, b) => b.stack - a.stack).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}: ${p.stack.toLocaleString()}`);
  });
  console.log(`Chips: ${total}/${6 * 10000} ${total === 6 * 10000 ? '✓' : '✗'}`);
  players.forEach(p => p.socket.close());
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });