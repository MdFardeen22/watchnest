import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/socket.context.jsx';
import { useTheme } from '../contexts/theme.context.jsx';
import { parseYouTubeVideoId } from '../utils/youtube-utils.js';

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

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
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
  const [showLeavePopup, setShowLeavePopup] = useState(false);

  const displayName = useMemo(() => sessionStorage.getItem(WATCHNEST_NAME_KEY) ?? '', []);
  const userId = useMemo(getOrCreateUserId, []);
  const syncingRef = useRef(false);
  const lastSyncRef = useRef(null);

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
    setVideoLoading(Boolean(room?.youtubeVideoId));
  }, [room?.youtubeVideoId]);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!window.YT || !window.YT.Player) {
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        if (room?.youtubeVideoId) {
          createYouTubePlayer(room.youtubeVideoId, isHost);
        }
      };
    }

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  useEffect(() => {
    if (!room?.youtubeVideoId || !playerContainerRef.current) {
      return undefined;
    }

    if (window.YT && window.YT.Player) {
      createYouTubePlayer(room.youtubeVideoId, isHost);
      return undefined;
    }

    window.onYouTubeIframeAPIReady = () => {
      createYouTubePlayer(room.youtubeVideoId, isHost);
    };

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [room?.youtubeVideoId, isHost]);

  function createYouTubePlayer(videoId, hostMode) {
    if (!playerContainerRef.current || typeof window.YT === 'undefined' || !window.YT.Player) {
      return;
    }

    destroyYouTubePlayer();

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: {
        controls: hostMode ? 1 : 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        disablekb: hostMode ? 0 : 1,
      },
      events: {
        onReady: (event) => {
          setVideoLoading(false);
          if (!hostMode) {
            event.target.mute();
          }
        },
        onStateChange: handleYouTubeStateChange,
        onPlaybackRateChange: handleYouTubeRateChange,
      },
    });
  }

  function destroyYouTubePlayer() {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  }

  function handleYouTubeStateChange(event) {
    if (!isHost || syncingRef.current) {
      return;
    }

    const state = event.data;
    if (state === window.YT.PlayerState.PLAYING) {
      emitVideoSync('play');
    }

    if (state === window.YT.PlayerState.PAUSED) {
      emitVideoSync('pause');
    }
  }

  function handleYouTubeRateChange() {
    if (!isHost || syncingRef.current) {
      return;
    }

    emitVideoSync('ratechange');
  }

  function handleHostSeekDetection() {
    const player = playerRef.current;
    if (!player || !isHost || syncingRef.current) {
      return;
    }

    const currentTime = Number(player.getCurrentTime?.() ?? 0);
    const lastState = lastSyncRef.current;
    const now = Date.now();
    let expectedTime = currentTime;

    if (lastState && !lastState.paused) {
      expectedTime = lastState.currentTime + (now - lastState.receivedAt) / 1000;
    }

    const drift = Math.abs(currentTime - expectedTime);
    if (drift > 1.5) {
      emitVideoSync('seek');
    }

    lastSyncRef.current = {
      currentTime,
      playbackRate: Number(player.getPlaybackRate?.() ?? 1),
      paused: player.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING,
      receivedAt: now,
    };
  }

  useEffect(() => {
    if (!isHost || !playerRef.current) {
      return undefined;
    }

    const interval = setInterval(handleHostSeekDetection, 1000);
    return () => clearInterval(interval);
  }, [isHost]);

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
    socket.on('video-sync', handleVideoSync);
    socket.on('error', handleSocketError);
    socket.emit('join-room', { roomCode: code, userId, userName: displayName });

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('video-sync', handleVideoSync);
      socket.off('error', handleSocketError);
    };
  }, [displayName, navigate, roomCode, socket]);

  function applyRemoteSync(syncPayload) {
    const player = playerRef.current;
    if (!player || !syncPayload) {
      return;
    }

    syncingRef.current = true;
    const desiredTime = Number(syncPayload.currentTime ?? 0);
    const desiredRate = Number(syncPayload.playbackRate ?? 1);
    const shouldPause = Boolean(syncPayload.paused);

    const currentTime = Number(player.getCurrentTime?.() ?? 0);
    if (!Number.isNaN(desiredTime) && Math.abs(currentTime - desiredTime) > 0.5) {
      player.seekTo(desiredTime, true);
    }

    if (!Number.isNaN(desiredRate) && player.getPlaybackRate?.() !== desiredRate) {
      player.setPlaybackRate(desiredRate);
    }

    lastSyncRef.current = {
      currentTime: desiredTime,
      playbackRate: desiredRate,
      paused: shouldPause,
      receivedAt: Date.now(),
    };

    if (shouldPause) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }

    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  function handleVideoSync({ roomCode: code, action, currentTime, playbackRate, paused }) {
    if (code !== roomCode.toUpperCase()) {
      return;
    }

    applyRemoteSync({ currentTime, playbackRate, paused, action });
  }

  function handleLeaveRoom() {
    if (socket && roomCode) {
      socket.emit('leave-room', { roomCode: roomCode.toUpperCase() });
    }

    sessionStorage.removeItem(WATCHNEST_ROOM_KEY);
    navigate('/');
  }

  function handleLoadVideo(event) {
    event.preventDefault();

    if (!youtubeUrl.trim()) {
      setError('Paste a YouTube video link first.');
      return;
    }

    const videoId = parseYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      setError('Please enter a valid YouTube URL.');
      return;
    }

    setError('');
    setVideoLoading(true);

    socket.emit('load-video', { roomCode: room.roomCode, videoUrl: videoId }, (response) => {
      setVideoLoading(false);

      if (!response?.success) {
        setError(response?.error ?? 'Unable to load video.');
        return;
      }

      setYoutubeUrl('');
    });
  }

  function emitVideoSync(action) {
    if (!socket || !room?.roomCode || !isHost) {
      return;
    }

    const player = playerRef.current;
    if (!player) {
      return;
    }

    const currentTime = Number(player.getCurrentTime?.() ?? 0);
    const playbackRate = Number(player.getPlaybackRate?.() ?? 1);
    const paused = player.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING;

    socket.emit('video-sync', {
      roomCode: room.roomCode,
      action,
      currentTime,
      playbackRate,
      paused,
    });
  }

  useEffect(() => {
    if (isHost || !room?.youtubeVideoId) {
      return undefined;
    }

    const interval = setInterval(() => {
      const syncState = lastSyncRef.current;
      const player = playerRef.current;

      if (!syncState || !player) {
        return;
      }

      const expectedTime = syncState.paused
        ? syncState.currentTime
        : syncState.currentTime + (Date.now() - syncState.receivedAt) / 1000;

      const currentTime = Number(player.getCurrentTime?.() ?? 0);
      const drift = Math.abs(currentTime - expectedTime);
      if (drift > 1) {
        applyRemoteSync(syncState);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isHost, room?.youtubeVideoId]);

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
      <main className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#08090d] px-5 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full transition-colors duration-500"></div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full transition-colors duration-500"></div>
        
        <div className="relative z-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-8 text-center shadow-xl dark:shadow-2xl backdrop-blur-xl animate-pulse">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
            Room {roomCode}
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md transition-colors">Joining WatchNest...</h1>
          {error ? <p className="mt-3 text-sm font-medium text-red-500 dark:text-red-400">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-[#08090d] font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-300">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full z-0 transition-colors duration-500"></div>
      <div className="pointer-events-none fixed right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[600px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full z-0 transition-colors duration-500"></div>

      <header className="relative z-20 sticky top-0 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#08090d]/80 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md transition-colors">
                WatchNest
              </h1>
              <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-bold tracking-wider text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-sm border border-slate-200 dark:border-white/5 transition-colors">
                ROOM {room.roomCode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:scale-105 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <span className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-md transition-colors">
              {participants.length}/{room.maxUsers ?? 4} participants
            </span>
            <button
              type="button"
              onClick={() => setShowLeavePopup(true)}
              className="group relative flex h-10 items-center justify-center overflow-hidden rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 text-sm font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-500 hover:text-white hover:border-red-500 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-4 sm:p-5 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-black/50 shadow-inner">
            {room.youtubeVideoId ? (
              <>
                <div
                  ref={playerContainerRef}
                  className="h-full w-full"
                />
                {videoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-[#08090d]/80 backdrop-blur-sm z-10">
                    <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 dark:border-white/20 border-t-indigo-600 dark:border-t-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-full items-center justify-center px-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-black/40 dark:to-black/80 transition-colors duration-300">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
                    YouTube Sync Player
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg transition-colors">
                    No video loaded yet
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                    The room host can paste a YouTube link and load it for everyone.
                  </p>
                </div>
              </div>
            )}
          </div>

          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleLoadVideo}>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              disabled={!isHost}
              placeholder={isHost ? 'Paste YouTube video link' : 'Only the host can load a video'}
              className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-slate-50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 inset-shadow-sm"
            />
            <button
              type="submit"
              disabled={!isHost}
              className="flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-white transition-all hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#08090d] disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            >
              Load Video
            </button>
          </form>

          {error ? <p className="mt-3 text-sm font-medium text-red-500 dark:text-red-400 drop-shadow-sm">{error}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1fr_0.95fr]">
          <aside className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">Participants</h2>
              <span className="rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 transition-colors">
                {participants.length} online
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`rounded-xl border p-3 transition-all ${
                    participant.isHost
                      ? 'border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                      : 'border-slate-200 dark:border-white/5 bg-white dark:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white drop-shadow-sm transition-colors">
                        {participant.name}
                        {participant.id === socket.id ? ' (you)' : ''}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors">
                        <span className={`h-2 w-2 rounded-full ${participant.micEnabled ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        {participant.micEnabled ? 'Mic on' : 'Mic off'}
                      </p>
                    </div>
                    {participant.isHost ? (
                      <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 text-xs font-bold tracking-wide text-indigo-700 dark:text-indigo-300 transition-colors">
                        HOST
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
            <div className="mb-6 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500 transition-colors">
                Voice
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">
                Voice Controls
              </h2>
            </div>

            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-6 text-center shadow-inner transition-colors">
              <div className={`mb-5 h-5 w-5 rounded-full transition-all duration-300 ${muted ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-110'}`} />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors">
                {muted ? 'Your microphone is currently muted' : 'Your microphone is active'}
              </p>
              <button
                type="button"
                onClick={() => setMuted((current) => !current)}
                className={`mt-6 flex h-12 items-center justify-center rounded-xl px-8 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  muted 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200' 
                    : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white'
                }`}
              >
                {muted ? 'Unmute Microphone' : 'Mute Microphone'}
              </button>
            </div>
          </section>

          <aside className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
            <div className="mb-4">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">Room Chat</h2>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-500 transition-colors">Talk with your friends</p>
            </div>

            <div className="flex h-64 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-4 shadow-inner custom-scrollbar transition-colors">
              {messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.03] px-3.5 py-2.5 shadow-sm dark:shadow-none transition-colors">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {message.author}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{message.text}</p>
                </div>
              ))}
            </div>

            <form className="mt-4 flex gap-2" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Type a message..."
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-slate-50 dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 inset-shadow-sm"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="flex h-12 items-center justify-center rounded-xl bg-slate-900 dark:bg-white px-5 font-bold text-white dark:text-slate-950 transition-all hover:bg-slate-800 dark:hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-md"
              >
                Send
              </button>
            </form>
          </aside>
        </section>
      </div>
      
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>

      {/* Leave Room Confirmation Popup */}
      {showLeavePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-[#08090d]/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] p-6 shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 transition-colors">Leave Room?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 transition-colors">
              Are you sure you want to leave this WatchNest room? Your connection will be closed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLeavePopup(false)}
                className="flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="flex h-10 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-all hover:bg-red-500 active:scale-[0.98] shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Yes, leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
