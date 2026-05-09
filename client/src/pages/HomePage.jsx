import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/socket.context.jsx';

const WATCHNEST_NAME_KEY = 'watchnest.displayName';
const WATCHNEST_ROOM_KEY = 'watchnest.currentRoom';

export default function HomePage() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = ({ room }) => {
      setLoading(false);
      sessionStorage.setItem(WATCHNEST_ROOM_KEY, JSON.stringify(room));
      navigate(`/room/${room.roomCode}`);
    };

    const handleError = ({ message }) => {
      setLoading(false);
      setError(message);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('error', handleError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [socket, navigate]);

  function handleCreateRoom(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setLoading(true);
    sessionStorage.setItem(WATCHNEST_NAME_KEY, name.trim());
    sessionStorage.removeItem(WATCHNEST_ROOM_KEY);

    if (!connected) {
      setLoading(false);
      setError('Unable to connect to the server. Please wait and try again.');
      return;
    }

    socket.timeout(5000).emit('create-room', { userName: name.trim() }, (timeoutError, response) => {
      setLoading(false);

      if (timeoutError) {
        setError('Create room timed out. Please try again.');
        return;
      }

      if (!response?.success) {
        setError(response?.error ?? 'Could not create room.');
        return;
      }

      sessionStorage.setItem(WATCHNEST_ROOM_KEY, JSON.stringify(response.room));
      navigate(`/room/${response.roomCode}`);
    });
  }

  function handleJoinRoom(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode || roomCode.length !== 6 || !/^[A-Z0-9]+$/.test(roomCode)) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    setError('');
    setLoading(true);
    sessionStorage.setItem(WATCHNEST_NAME_KEY, name.trim());
    sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
    socket.emit('join-room', { roomCode, userName: name.trim() });
  }

  if (!socket || !connected) {
    return (
      <main className="min-h-screen bg-[#08090d] text-white flex items-center justify-center px-5">
        <div className="rounded-2xl border border-white/10 bg-black/50 px-8 py-7 text-center shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Connecting to WatchNest
          </p>
          <p className="mt-3 text-base text-slate-200">
            Establishing a realtime connection to the server...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Private watch party rooms
          </div>

          <h1 className="text-5xl font-semibold leading-none tracking-tight text-white sm:text-7xl">
            WatchNest
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Watch Google Drive videos together in private rooms with synchronized host controls, voice chat, and clean room sharing.
          </p>

          <div className="mt-9 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Your name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your display name"
                maxLength={32}
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                required
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-slate-950 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#08090d] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create room'}
              </button>
              <a
                href="#join-room"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#08090d]"
              >
                Join existing room
              </a>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>

        <div id="join-room" className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Join room
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Enter your invite details
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleJoinRoom}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Room code
              </span>
              <input
                type="text"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="A7K9Q2"
                maxLength={6}
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-4 text-sm font-semibold uppercase tracking-[0.18em] text-white outline-none transition placeholder:text-slate-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-[#d8b46a] px-5 text-sm font-bold text-[#15110a] transition hover:bg-[#e7c77f] focus:outline-none focus:ring-2 focus:ring-[#d8b46a] focus:ring-offset-2 focus:ring-offset-[#101115] disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join room'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
