# Architecture

WatchNest is split into two workspaces:

- `client`: React + Vite UI, Socket.IO client, WebRTC audio mesh.
- `server`: Express API, Socket.IO signaling, in-memory ephemeral room store.

The server owns room membership, capacity, host assignment, video normalization, and host-only room mutations. Rooms are intentionally stored in memory and are deleted when the final participant leaves.

The client keeps UI concerns modular:

- `lib`: API and Socket.IO client factories.
- `hooks`: room lifecycle and WebRTC audio orchestration.
- `components`: lobby, room shell, video stage, host controls, audio controls, participant list.

Google Drive support uses Drive preview URLs because Drive-hosted files are not reliable as direct CORS-enabled media sources. The host controls the room video source and sync state; Drive's embedded preview player does not expose a stable public playback API.
