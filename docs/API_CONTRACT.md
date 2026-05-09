# API Contract

Base URL: `/api`

## `GET /health`

Returns service health.

## `POST /rooms`

Creates an ephemeral room.

Request:

```json
{
  "hostName": "Fardeen",
  "videoUrl": "https://drive.google.com/file/d/FILE_ID/view"
}
```

Response:

```json
{
  "room": {
    "id": "A7K9Q2",
    "hostId": null,
    "hostName": "Fardeen",
    "videoUrl": "https://drive.google.com/file/d/FILE_ID/preview",
    "participants": [],
    "capacity": 4
  }
}
```

The first socket participant to join becomes host.

## `GET /rooms/:roomId`

Returns current room state or `404 ROOM_NOT_FOUND`.

## `POST /video/resolve`

Normalizes a Google Drive file URL or file id into a preview URL.
