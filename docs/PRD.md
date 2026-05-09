# Product Requirements

WatchNest lets up to four people watch the same Google Drive video in a private ephemeral room while talking over audio-only WebRTC.

## Core flows

1. Host creates a room with a display name and Google Drive video link.
2. Guests join with a room code and display name.
3. Everyone sees the shared video preview and participant list.
4. Users opt in to microphone access and can mute themselves.
5. Host can replace the video and update sync state.
6. Rooms disappear when empty.

## Non-goals

- Persistent accounts
- Room history
- More than four users
- Server-routed media
