# Poker with Friends ♠️

Multiplayer Texas Hold'em poker to play with friends. Self-hosted on your machine, zero external servers needed. Real-time WebSocket gameplay with virtual chips, tournament blind levels, and avatar uploads.

## How it works

One person hosts the game on their PC. Everyone else connects through a **public ngrok URL** — no accounts, no servers, no downloads for your friends. They just open a link.

```
Your PC (host)                    Friends (any device)
┌──────────────────┐              ┌──────────┐
│  Backend :3001   │◄── ngrok ──►│  Browser │
│  + Express       │   tunnel    │  (phone, │
│  + Socket.IO     │              │  tablet, │
│  + Poker engine  │              │  laptop) │
│  Frontend :3000  │              └──────────┘
│  + Next.js       │
└──────────────────┘
```

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/CarlosPozoC/Poker-with-friends.git
cd Poker-with-friends
cd backend && npm install
cd ../frontend && npm install
```

### 2. Get an ngrok auth token

Sign up at [ngrok.com](https://ngrok.com) (free). Copy your authtoken from the dashboard.

### 3. Configure

Edit `backend/.env`:

```env
NGROK_AUTHTOKEN=your_token_here
NGROK_ENABLED=true
```

### 4. Run

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend  
cd frontend && npm run dev
```

The backend console will show your public URL. Share it with your friends.

### 5. Play

1. Each player opens the public URL
2. Create an account (username + password)
3. Upload an avatar (optional)
4. Create a new table or join with a room code
5. Press **Deal Cards** to start

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Framer Motion, Zustand |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| Database | SQLite (via Prisma) |
| Tunneling | ngrok (direct child_process, no library bugs) |
| Audio | Custom AudioManager with pool-based HTMLAudio + Web Audio API fallback |

## Features

- **6-player Texas Hold'em** with full poker rules
- **Tournament blind levels** (20 levels, 10/20 to 1500/3000)
- **Side pot calculation** for all-in scenarios
- **Proper hand evaluation** with kicker-based tiebreaking (via pokersolver)
- **Quick bet buttons** (1/2 pot, 2/3 pot, pot, all-in)
- **Avatar uploads** (JPG, PNG, WebP, up to 2MB)
- **Sound effects** (MP3 files or Web Audio API fallback tones)
- **Responsive design** — works on phones, tablets, and desktop
- **Orientation lock** for mobile (landscape required)
- **Fullscreen button** with iOS/Safari support
- **Chip rain animations** when the pot increases

## Project structure

```
poker-game/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express + Socket.IO server
│   │   ├── ngrok.ts          # ngrok tunnel (spawns binary directly)
│   │   ├── config/           # Environment config
│   │   ├── game/             # Poker engine, deck, hand evaluator
│   │   ├── routes/           # Auth (register/login) + Profile (avatar)
│   │   └── socket/           # Socket.IO event handlers
│   ├── prisma/schema.prisma  # SQLite database schema
│   └── scripts/              # Test scripts (bots, hand eval tests)
└── frontend/
    ├── app/                  # Next.js pages (home, game)
    ├── components/           # React components (table, cards, action panel)
    ├── hooks/                # Custom hooks (useGameAudio)
    ├── lib/                  # Utilities (audio manager, socket client, types)
    ├── store/                # Zustand store
    └── public/sounds/        # MP3/WAV sound effect files
```

## Adding sound effects

Drop `.mp3`, `.wav`, or `.m4a` files in `frontend/public/sounds/`:

| File | When it plays |
|---|---|
| `call_raise_allin.mp3` | Chips pushed to pot |
| `check.m4a` | Player checks |
| `fold.wav` | Player folds |
| `dealing_one_card.wav` | Cards dealt |

Missing files use Web Audio API tone generators as fallback.

## License

MIT — use it, fork it, share it. Just keep the attribution.
