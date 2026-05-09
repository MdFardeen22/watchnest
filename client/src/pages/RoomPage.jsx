import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/socket.context.jsx';
import { parseGoogleDriveVideo } from '../utils/drive-utils.js';

const WATCHNEST_NAME_KEY = 'watchnest.displayName';
const WATCHNEST_ROOM_KEY = 'watchnest.currentRoom';

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [room, setRoom] = useState(() => {
    const savedRoom = sessionStorage.getItem(WATCHNEST_ROOM_KEY);

    if (!savedRoom) {
      return null;
    }

    try {
      return JSON.parse(savedRoom);
    } catch {
      sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
      return null;
    }
  });
  const [error, setError] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'system-ready',
      author: 'WatchNest',
      text: 'Room chat is ready for realtime wiring.',
    },
  ]);

  const displayName = useMemo(() => sessionStorage.getItem(WATCHNEST_NAME_KEY) ?? '', []);

  const participants = useMemo(() => {
    return (room?.participants ?? room?.users ?? []).map((participant) => ({
      ...participant,
      micEnabled: participant.id === socket?.id ? !muted : Boolean(participant.micEnabled),
    }));
  }, [muted, room, socket?.id]);

  const selfParticipant = participants.find((participant) => participant.id === socket?.id);
  const isHost = Boolean(selfParticipant?.isHost || room?.hostId === socket?.id);

  function applyRoomState(nextRoom) {
    if (!nextRoom) {
      sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
      setRoom(null);
      setVideoLoading(false);
      return;
    }

    sessionStorage.setItem(WATCHNEST_ROOM_KEY, JSON.stringify(nextRoom));
    setRoom(nextRoom);
  }

  useEffect(() => {
    if (room?.videoUrl) {
      setVideoLoading(true);
    } else {
      setVideoLoading(false);
    }
  }, [room?.videoUrl]);

  useEffect(() => {
    if (!socket || !connected || !roomCode) {
      return undefined;
    }

    if (!displayName) {
      navigate('/');
      return undefined;
    }

    const code = roomCode.toUpperCase();

    function handleRoomJoined({ room: joinedRoom }) {
      applyRoomState(joinedRoom);
      setError('');
    }

    function handleRoomUpdated({ room: updatedRoom }) {
      applyRoomState(updatedRoom);
      setError('');
    }

    function handleSocketError({ message }) {
      if (message === 'Room not found') {
        sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
        setRoom(null);
      }

      setError(message ?? 'Unable to join room.');
    }

    socket.on('room-joined', handleRoomJoined);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('error', handleSocketError);
    socket.emit('join-room', { roomCode: code, userName: displayName });

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('error', handleSocketError);
    };
  }, [displayName, navigate, roomCode, socket]);

  function handleLeaveRoom() {
    if (socket && roomCode) {
      socket.emit('leave-room', { roomCode: roomCode.toUpperCase() });
    }

    sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
    navigate('/');
  }

  function handleLoadVideo(event) {
    event.preventDefault();

    if (!driveUrl.trim()) {
      setError('Paste a Google Drive video link first.');
      return;
    }

    try {
      const previewUrl = parseGoogleDriveVideo(driveUrl.trim());
      setError('');
      setVideoLoading(true);

      socket.emit('load-video', { roomCode: room.roomCode, videoUrl: previewUrl }, (response) => {
        setVideoLoading(false);

        if (!response?.success) {
          setError(response?.error ?? 'Unable to load video.');
          return;
        }

        setDriveUrl('');
      });
    } catch (validationError) {
      setError(validationError.message ?? 'Invalid Google Drive video link');
    }
  }

  function handleSendMessage(event) {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        author: displayName,
        text: chatInput.trim(),
      },
    ]);
    setChatInput('');
  }

  if (!socket || !connected || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090d] px-5 text-white">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Room {roomCode}
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Joining WatchNest</h1>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-slate-100">
      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              WatchNest
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Room {room.roomCode}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300">
              {participants.length}/{room.maxUsers ?? 4} participants
            </span>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
            >
              Leave room
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-5 lg:px-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {room.videoUrl ? (
              <>
                <iframe
                  title="WatchNest Google Drive video"
                  src={room.videoUrl}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  onLoad={() => setVideoLoading(false)}
                />
                {videoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                    <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-full items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Google Drive Player
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    No video loaded yet
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    The room host can paste a Google Drive video link and load it for everyone.
                  </p>
                </div>
              </div>
            )}
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleLoadVideo}>
            <input
              type="url"
              value={driveUrl}
              onChange={(event) => setDriveUrl(event.target.value)}
              disabled={!isHost}
              placeholder={isHost ? 'Paste Google Drive video link' : 'Only the host can load a video'}
              className="h-12 rounded-lg border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isHost}
              className="h-12 rounded-lg bg-[#d8b46a] px-5 text-sm font-bold text-[#15110a] transition hover:bg-[#e7c77f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load video
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1fr_0.95fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Participants</h2>
              <span className="text-sm text-slate-500">{participants.length} online</span>
            </div>

            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`rounded-xl border p-3 ${
                    participant.isHost
                      ? 'border-[#d8b46a]/40 bg-[#d8b46a]/10'
                      : 'border-white/10 bg-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {participant.name}
                        {participant.id === socket.id ? ' (you)' : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {participant.micEnabled ? 'Mic on' : 'Mic off'}
                      </p>
                    </div>
                    {participant.isHost ? (
                      <span className="rounded-full bg-[#d8b46a] px-2.5 py-1 text-xs font-bold text-[#15110a]">
                        Host
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Voice
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Voice controls
              </h2>
            </div>

            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/25 p-6 text-center">
              <div className={`mb-4 h-4 w-4 rounded-full ${muted ? 'bg-slate-600' : 'bg-emerald-400 shadow-lg shadow-emerald-500/30'}`} />
              <p className="text-sm text-slate-400">
                Speaking indicator placeholder
              </p>
              <button
                type="button"
                onClick={() => setMuted((current) => !current)}
                className="mt-6 h-11 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <p className="mt-1 text-sm text-slate-500">Realtime chat panel foundation</p>
            </div>

            <div className="flex h-72 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-3">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg bg-white/[0.05] px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {message.author}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">{message.text}</p>
                </div>
              ))}
            </div>

            <form className="mt-3 flex gap-2" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Message the room"
                className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
              />
              <button
                type="submit"
                className="h-11 rounded-lg bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
              >
                Send
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
