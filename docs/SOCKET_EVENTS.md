# Socket Events

## Client to server

- `room:join`: `{ roomId, name, muted }`
- `room:leave`
- `playback:update`: `{ isPlaying, time }`, host only
- `video:update`: `{ videoUrl }`, host only
- `participant:mute`: `{ muted }`
- `webrtc:offer`: `{ to, description }`
- `webrtc:answer`: `{ to, description }`
- `webrtc:ice-candidate`: `{ to, candidate }`

## Server to client

- `room:updated`: full room state
- `participant:joined`: `{ participant, room }`
- `participant:left`: `{ participantId, room }`
- `playback:sync`: playback state
- `video:updated`: `{ videoUrl, playback }`
- `webrtc:offer`: `{ from, description }`
- `webrtc:answer`: `{ from, description }`
- `webrtc:ice-candidate`: `{ from, candidate }`

## Constraints

- Rooms are capped at 4 participants.
- Room mutations that affect the group video require host authority.
- If the host leaves, the longest-present remaining participant becomes host.
- If the final participant leaves, the room is deleted.
