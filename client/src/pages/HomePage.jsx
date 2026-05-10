import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/socket.context.jsx';
import { useTheme } from '../contexts/theme.context.jsx';
import logo from '../assets/logo.png';

const WATCHNEST_NAME_KEY = 'watchnest.displayName';
const WATCHNEST_ROOM_KEY = 'watchnest.currentRoom';
const WATCHNEST_USER_ID_KEY = 'watchnest.userId';

function getOrCreateUserId() {
  let userId = localStorage.getItem(WATCHNEST_USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(WATCHNEST_USER_ID_KEY, userId);
  }

  return userId;
}

export default function HomePage() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const userId = useMemo(getOrCreateUserId, []);

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

    socket.timeout(5000).emit('create-room', { userId, userName: name.trim() }, (timeoutError, response) => {
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
    socket.emit('join-room', { roomCode, userId, userName: name.trim() });
  }

  if (!socket || !connected) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#08090d] dark:text-white flex items-center justify-center px-5 transition-colors duration-300">
        <div className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-black/50 px-8 py-7 text-center shadow-2xl shadow-black/5 dark:shadow-black/30 backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Connecting to WatchNest
          </p>
          <div className="mt-4 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-white/20 dark:border-t-white"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#08090d] px-5 py-10 font-sans text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:scale-105 active:scale-95"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <style>
        {`
          @keyframes enterFade {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-enter {
            animation: enterFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      {/* Background glow effects */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full transition-colors duration-500"></div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full transition-colors duration-500"></div>

      <section className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center animate-enter">
          
          <h1 className="flex justify-center -mb-6">
            <img src={logo} alt="WatchNest" className="h-[280px] object-contain drop-shadow-sm dark:drop-shadow-xl transition-all" />
          </h1>

          <p className="mx-auto max-w-sm text-base leading-relaxed text-slate-600 dark:text-slate-400 transition-colors">
            Watch together in sync. Chat, talk, and enjoy movies with friends.
          </p>
        </div>

        <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-500 animate-enter" style={{ animationDelay: '0.1s' }}>
          {mode === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-enter">
              <button
                type="button"
                onClick={() => { setMode('create'); setError(''); }}
                className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900 dark:bg-white px-6 font-bold text-white dark:text-slate-950 transition-all hover:scale-[1.02] hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => { setMode('join'); setError(''); }}
                className="flex h-14 w-full items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-6 font-bold text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Join Room
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-5 animate-enter">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white transition-colors">Create a Room</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Host a new watch party</p>
              </div>
              
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">
                  Your Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your display name"
                  maxLength={32}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:bg-slate-50 dark:focus:border-indigo-500/50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 shadow-sm inset-shadow-sm"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-6 font-bold text-white dark:text-slate-950 transition-all hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-slate-900 dark:disabled:hover:bg-white disabled:cursor-not-allowed active:scale-[0.98] shadow-md"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              
              <button
                type="button"
                onClick={() => { setMode(null); setError(''); }}
                className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2 flex items-center justify-center gap-1"
              >
                ← Back
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-5 animate-enter">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white transition-colors">Join a Room</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Enter details to connect</p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">
                    Your Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your display name"
                    maxLength={32}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:bg-slate-50 dark:focus:border-indigo-500/50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 shadow-sm inset-shadow-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">
                    Room Code
                  </span>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                    placeholder="e.g. A7K9Q2"
                    maxLength={6}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-center text-lg font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:bg-slate-50 dark:focus:border-indigo-500/50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 shadow-sm inset-shadow-sm uppercase"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || roomCode.length !== 6}
                className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-white transition-all hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#08090d] disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed active:scale-[0.98] shadow-md"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
              
              <button
                type="button"
                onClick={() => { setMode(null); setError(''); }}
                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2 flex items-center justify-center gap-1"
              >
                ← Back
              </button>
            </form>
          )}
          
          {/* Error Message Container */}
          <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-20 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
