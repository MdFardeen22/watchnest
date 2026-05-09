# WatchNest

Watch together, talk together.

## Overview
WatchNest is a private watch-party web application where friends can watch Google Drive videos together in sync while using built-in voice chat and text chat.

## Features
- Create room
- Unique room code
- Join with name
- Host-only playback control
- Google Drive video support
- Voice chat
- Text chat
- Participant moderation
- Host transfer
- Auto room cleanup
- Mobile responsive
- Progressive Web App (PWA)

## Tech Stack
Frontend:
- React
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express
- Socket.IO

Voice:
- WebRTC (simple-peer)

Deployment:
- Vercel
- Render

## Limits
- Max 4 users per room
- No database
- Ephemeral rooms

## Project Goal
A lightweight, free, private watch-party platform for long-dist
WatchNest is a private realtime watch-room app built with React, Vite, Node, Express, Socket.IO, and WebRTC audio.

## Features

- Ephemeral in-memory rooms
- Four users maximum per room
- Host authority for video source and sync state
- Google Drive video preview support
- Audio-only WebRTC mesh chat
- Responsive dark interface

## Run locally

```bash
npm install
npm run dev
```

Client: `http://localhost:5173`

Server: `http://localhost:4000`

Copy `client/.env.example` and `server/.env.example` if you need non-default ports or origins.

## Verification

```bash
npm run build
npm run check
```
