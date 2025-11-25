# 9up-fighter

A multiplayer beat 'em up fighting game with sprite-based animations and networked gameplay.

## Features

- **Multiplayer Support**: Host or join games via WebSocket
- **Sprite-Based Animation**: AI-generated pixel art sprites with smooth animations
- **Special Moves**: Uppercut, Whirlwind, Energy Blast, and more
- **Weapon System**: Pick up and use bats, swords, and spears
- **Pause Functionality**: Pause/resume gameplay anytime

## Quick Start

### 1. Start the Server

```bash
# Python WebSocket server
python server/server.py
```

Server runs on `localhost:8080`

### 2. Start the Client

```bash
# Serve static files
cd client
python -m http.server 8081
```

Game available at `http://localhost:8081/9up.html`

### 3. Play

1. Click **Host Game** to create a room
2. Other players can click **Join Game** and enter your IP
3. Host clicks **Start Match** to begin

## Controls

### Movement
- **Arrow Keys**: Move character (Up/Down/Left/Right)
- **Double-tap →/←**: Run

### Actions
- **A**: Attack / Pick up weapon
- **S**: Jump
- **D**: Defend

### Special Moves (require MP)
- **D + A**: Energy Blast (30 MP)
- **D + ↑ + A**: Uppercut (15 MP)
- **D + ↓ + A**: Whirlwind (30 MP)
- **D + ↑ + S**: Heal (50 MP, restores 20 HP)
- **D + ↓ + S**: Drop Weapon

### UI
- **Pause Button**: Top-right corner

## Project Structure

```
9up-fighter/
├── client/                    # Frontend game client
│   ├── src/
│   │   ├── core/             # Game engine (Game.js, Input.js, Network.js)
│   │   ├── entities/         # Player, Enemy, Entity classes
│   │   ├── graphics/         # Sprite sheets and animation configs
│   │   ├── weapons/          # Weapon system
│   │   ├── effects/          # Particles, projectiles
│   │   └── items/            # Collectible items
│   ├── resource/
│   │   └── sprite-sheet/     # Sprite sheet images
│   ├── 9up.html              # Main game page
│   └── debug_sprites.html    # Sprite sheet debugger
├── server/
│   └── server.py             # WebSocket server
├── util/
│   ├── process_sprites.js    # Sprite sheet processor
│   └── README.md             # Sprite processing guide
└── README.md                 # This file
```

## Development

### Adding New Sprites

See [`util/README.md`](util/README.md) for detailed instructions on:
- Generating sprites with AI
- Processing sprite sheets
- Configuring animations

### Modifying Game Logic

- **Player controls**: `client/src/core/Game.js` → `handleInput()`
- **Combat system**: `client/src/core/Game.js` → `performMove()`
- **Animation config**: `client/src/graphics/PlayerSpriteConfig.js`
- **Network sync**: `client/src/core/Network.js`

### Debugging

- **Sprite Sheet Viewer**: `http://localhost:8081/debug_sprites.html`
- **Console Logs**: Check browser console for network/game events
- **Debug Panel**: In-game panel shows room, player count, role, and ID

## Technical Details

### Technologies
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas
- **Backend**: Python WebSocket server (websockets library)
- **Sprite Processing**: Node.js with Jimp library

### Game Loop
- **Frame Rate**: 60 FPS (16.67ms per frame)
- **Physics**: Custom 2.5D engine with X, Y (height), Z (depth) coordinates
- **Network**: State synchronization at 60 FPS via WebSocket

### Animation System
- **Sprite Sheets**: 128x128 pixel frames in grid layout
- **Frame-based**: Each animation defined by row, frame count, and frame rate
- **State Machine**: Entity states (idle, walk, run, attack, etc.)

## Troubleshooting

### Game won't connect
- Ensure server is running on port 8080
- Check firewall settings
- For LAN play, use actual IP address (not localhost)

### Sprites look wrong
- Verify sprite sheet is in `client/resource/sprite-sheet/`
- Check `PlayerSpriteConfig.js` row mappings
- Use debug tool to inspect sprite sheet

### Animations are slow
- Increase `frameRate` values in sprite config
- Current defaults: 12-30 FPS depending on animation

### Special moves don't work
- Check MP bar (blue bar under HP)
- MP regenerates slowly over time
- Each move has different MP cost

## Documentation

- **Sprite Processing**: [`util/README.md`](util/README.md)
- **Sprite Migration**: [`SPRITE_MIGRATION.md`](SPRITE_MIGRATION.md)
- **Recent Fixes**: [`FIXES_APPLIED.md`](FIXES_APPLIED.md)

## License

MIT License - Feel free to use and modify!