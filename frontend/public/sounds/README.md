# Sound Effects Directory

Place your `.mp3` files here. The system will preload them automatically.

## Required files:

| File | When it plays |
|---|---|
| `deal.mp3` | Cards dealt (pre-flop, flop, turn, river) |
| `chip.mp3` | Chips pushed to pot (bet/call/raise) |
| `fold.mp3` | Player folds |
| `check.mp3` | Player checks |
| `call.mp3` | Player calls |
| `raise.mp3` | Player raises |
| `allin.mp3` | Player goes all-in |
| `turn-alert.mp3` | It's your turn to act |
| `win.mp3` | You win the hand |
| `lose.mp3` | Someone else wins |
| `bust.mp3` | Player eliminated |
| `error.mp3` | Error occurred |
| `showdown.mp3` | Showdown phase |

## Where to get sounds:
- **Pixabay**: https://pixabay.com/sound-effects/ (search "poker chips", "card shuffle")
- **Freesound**: https://freesound.org/ (search "casino", "cards", "chips")
- **ZapSplat**: https://www.zapsplat.com/ (free with attribution)

## Tips:
- Keep files short (0.1-0.5s ideal)
- Trim silence from the beginning
- Use 128kbps MP3 or OGG
- File size under 50KB each

## Fallback:
If MP3 files are missing, the system generates simple tones using the Web Audio API
so you'll still hear feedback immediately.
