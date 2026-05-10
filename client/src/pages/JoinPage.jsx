import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function JoinPage() {
  const { roomCode } = useParams();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const userId = useMemo(getOrCreateUserId, []);

  useEffect(() => {
    // Check if invalid room code format
    if (!roomCode || roomCode.length !== 6 || !/^[a-zA-Z0-9]+$/.test(roomCode)) {
      setError('Room not found');
    }
  }, [roomCode]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = ({ room }) => {
      setLoading(false);
      sessionStorage.setItem(WATCHNEST_ROOM_KEY, JSON.stringify(room));
      navigate(`/room/${room.roomCode}`);
    };

    const handleError = ({ message }) => {
      setLoading(false);
      setError(message === 'Room not found' ? 'Room not found' : message);
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('error', handleError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [socket, navigate]);

  function handleJoinRoom(event) {
    event.preventDefault();
    if (error === 'Room not found') return;
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setError('');
    setLoading(true);
    sessionStorage.setItem(WATCHNEST_NAME_KEY, name.trim());
    sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), userId, userName: name.trim() });
  }

  if (!socket || !connected) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#08090d] dark:text-white flex items-center justify-center px-5 transition-colors duration-300">
        <div className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-black/50 px-8 py-7 text-center shadow-2xl shadow-black/5 dark:shadow-black/30 backdrop-blur-md">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="WatchNest" className="h-14 w-auto opacity-80" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Connecting...
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
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:scale-105 active:scale-95"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full transition-colors duration-500"></div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full transition-colors duration-500"></div>

      <section className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="WatchNest" className="h-20 w-auto drop-shadow-sm dark:drop-shadow-lg transition-all" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3 drop-shadow-sm transition-colors">
            You've been invited!
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-slate-600 dark:text-slate-400 transition-colors">
            Join room <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{roomCode}</span> to start watching together.
          </p>
        </div>

        <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-500">
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-5">
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
                  disabled={error === 'Room not found'}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:bg-slate-50 dark:focus:border-indigo-500/50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 shadow-sm inset-shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || error === 'Room not found'}
              className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-white transition-all hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#08090d] disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed active:scale-[0.98] shadow-md"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2 flex items-center justify-center gap-1"
            >
              ← Go to Home
            </button>
          </form>
          
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
