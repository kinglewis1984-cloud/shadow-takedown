# Shadow Takedown

A browser-based top-down stealth game inspired by Manhunt's cinematic execution kill-cam. Sneak up on guards undetected, take them down with an escalating arsenal of weapons, and rack up kill ratings from HASTY to SAVAGE.

**Play it live:** https://shadow-takedown.vercel.app

## Features

- 20 levels across two parts, each with its own map layout and guard patrol pool
- Difficulty scales with every level: guards get faster, see further, and shoot harder
- 20 unlockable weapons, each with a unique cinematic kill-cam
- Guards shoot back when alarmed — walls provide real cover via line-of-sight checks
- Touch controls for mobile play (virtual joystick + crouch/execute buttons)
- Personal best time and rating tracked per level, saved locally in your browser

## Development

```
npm install
npm run dev
```

Built with React + Vite, rendered on an HTML canvas.
