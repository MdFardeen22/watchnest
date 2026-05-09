# WatchNest Engineering Rules

Project Name: WatchNest

Build a production-quality private watch-party web application.

Core Stack:
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Realtime: Socket.IO
- Voice Chat: WebRTC using simple-peer
- Video Source: Google Drive embed/preview links

Product Requirements:
- private room system
- unique 6-character room code
- join using room code + name
- host-only video control
- synchronized playback
- text chat
- voice chat (audio only)
- max 4 users per room
- transfer host on host leave
- mute participant
- kick participant
- room lock
- auto delete room when empty
- mobile responsive
- PWA enabled
- fully free deployment

Engineering Rules:
- generate code file-by-file
- never dump entire project in one response
- clean architecture
- reusable components
- modular services
- modular socket handlers
- robust validation
- graceful reconnect handling
- accessibility basics
- concise comments only where needed
- environment variables for config
- sanitize user chat input

UI Rules:
- dark minimal theme
- clean typography
- subtle animations
- modern card layout
- responsive for mobile + desktop

Folder Strategy:
- separate components, hooks, services, utils, contexts
- backend should separate config, services, sockets, validators, utils

Code Quality:
- readable naming
- avoid duplicate code
- avoid dead code
- scalable structure
- professional folder or