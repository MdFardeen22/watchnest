import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/socket.context.jsx';
import { useTheme } from '../contexts/theme.context.jsx';
import { parseYouTubeVideoId } from '../utils/youtube-utils.js';
import ChatPanel from '../components/ChatPanel.jsx';
import { VoiceProvider } from '../contexts/voice.context.jsx';
import VoicePanel from '../components/VoicePanel.jsx';
import PeoplePanel from '../components/PeoplePanel.jsx';
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
  const [toast, setToast] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [messages, setMessages] = useState([]);
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const displayName = useMemo(() => sessionStorage.getItem(WATCHNEST_NAME_KEY) ?? '', []);
  const userId = useMemo(getOrCreateUserId, []);
  const syncingRef = useRef(false);
  const lastSyncRef = useRef(null);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  function handleFullscreen() {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      playerContainerRef.current.requestFullscreen().catch(console.error);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode);
    showToast('Room code copied');
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(link);
    showToast('Invite link copied');
  }

  async function handleShare() {
    const link = `${window.location.origin}/join/${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my WatchNest Room',
          text: `Join me in room ${roomCode} on WatchNest!`,
          url: link,
        });
        showToast('Shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  }

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
    
    if (nextRoom.chatMessages) {
      setMessages(nextRoom.chatMessages);
    }
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

    let initialStartTime = 0;
    if (room?.videoState) {
      const { currentTime, lastSyncAt, paused } = room.videoState;
      initialStartTime = currentTime || 0;
      if (!paused && lastSyncAt) {
        const drift = (Date.now() - new Date(lastSyncAt).getTime()) / 1000;
        if (drift > 0) {
           initialStartTime += drift;
        }
      }
    }

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
        start: Math.floor(initialStartTime),
      },
      events: {
        onReady: (event) => {
          setVideoLoading(false);
          if (!hostMode) {
            event.target.mute();
          }
          
          if (room?.videoState) {
            if (room.videoState.playbackRate) {
              event.target.setPlaybackRate(room.videoState.playbackRate);
            }
            if (!room.videoState.paused) {
              event.target.playVideo();
            }
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

    function handleNewMessage({ message }) {
      setMessages((prev) => [...prev, message]);
    }

    socket.on('room-joined', handleRoomJoined);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('video-sync', handleVideoSync);
    socket.on('new-message', handleNewMessage);
    socket.on('error', handleSocketError);
    socket.emit('join-room', { roomCode: code, userId, userName: displayName });

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('video-sync', handleVideoSync);
      socket.off('new-message', handleNewMessage);
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

  function handleSendMessage(messageText) {
    socket.emit('send-message', { message: messageText });
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
    <VoiceProvider roomCode={room.roomCode}>
      <main className="relative h-screen bg-slate-50 dark:bg-[#08090d] font-sans text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col transition-colors duration-300">
        {/* Background glow effects */}
        <div className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full z-0 transition-colors duration-500"></div>
        <div className="pointer-events-none fixed right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[600px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full z-0 transition-colors duration-500"></div>

        <header className="relative z-20 flex-none h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#08090d]/80 backdrop-blur-xl transition-colors duration-300 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="WatchNest" className="h-12 w-auto drop-shadow-sm dark:drop-shadow-md transition-all" />
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-bold tracking-wider text-slate-600 dark:text-slate-300 backdrop-blur-md shadow-sm border border-slate-200 dark:border-white/5 transition-all hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95"
            >
              ROOM {room.roomCode.toUpperCase()}
            </button>
            <span className="hidden sm:inline-block ml-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              {participants.length}/{room.maxUsers ?? 4} PEERS
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleCopyLink}
              className="hidden sm:flex h-9 items-center justify-center rounded-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95"
            >
              🔗 Copy Link
            </button>
            <button
              onClick={handleShare}
              className="flex h-9 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 active:scale-95"
            >
              📤 Share
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:scale-105 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setShowLeavePopup(true)}
              className="flex h-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 text-xs font-bold text-red-600 dark:text-red-400 transition-all hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 shadow-sm ml-1"
            >
              Leave
            </button>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Main Video Area (Left 75%) */}
          <section className="flex-1 lg:w-[75%] xl:w-[80%] flex flex-col p-3 lg:p-6 overflow-y-auto lg:overflow-hidden relative">
            <div className="relative flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-black overflow-hidden shadow-2xl transition-all duration-500 flex flex-col group">
              {room.youtubeVideoId ? (
                <>
                  <div
                    ref={playerContainerRef}
                    className="absolute inset-0 w-full h-full"
                  />
                  {videoLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-[#08090d]/80 backdrop-blur-sm z-10">
                      <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 dark:border-white/20 border-t-indigo-600 dark:border-t-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    </div>
                  ) : null}
                  
                  {/* Elegant overlay controls */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 flex items-start justify-between p-4">
                    <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold tracking-widest text-white backdrop-blur-md shadow-lg border border-white/10 uppercase flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Synced
                    </span>
                    <button
                      onClick={handleFullscreen}
                      className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 border border-white/10 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
                    >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-[#0a0a0f] transition-colors duration-300">
                  <div>
                    <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 shadow-inner">
                      <span className="text-4xl">🍿</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">
                      No video loaded yet
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 transition-colors max-w-sm mx-auto">
                      Waiting for the host to start a video. Grab your popcorn!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Input Form */}
            <form className="mt-4 flex shrink-0 gap-3" onSubmit={handleLoadVideo}>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                disabled={!isHost}
                placeholder={isHost ? 'Paste YouTube video link here...' : 'Only the host can load a video'}
                className="h-12 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 inset-shadow-sm backdrop-blur-md shadow-sm"
              />
              <button
                type="submit"
                disabled={!isHost}
                className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-6 font-bold text-white transition-all hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#08090d] disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                Load Video
              </button>
            </form>
            {error ? <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400 pl-1">{error}</p> : null}
          </section>

          {/* Sidebar Area (Right 25%) */}
          <aside className="w-full lg:w-[25%] xl:w-[20%] lg:min-w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex flex-col z-20">
            <div className="flex shrink-0 border-b border-slate-200 dark:border-white/10 p-2 gap-1">
              {['chat', 'people', 'voice'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-lg py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === tab 
                      ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden relative">
              <div className={`absolute inset-0 p-4 transition-all duration-300 transform ${activeTab === 'chat' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-8 -z-10 pointer-events-none'}`}>
                 <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
              </div>
              <div className={`absolute inset-0 p-4 transition-all duration-300 transform ${activeTab === 'people' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-8 -z-10 pointer-events-none'}`}>
                 <PeoplePanel participants={participants} />
              </div>
              <div className={`absolute inset-0 p-4 transition-all duration-300 transform ${activeTab === 'voice' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-8 -z-10 pointer-events-none'}`}>
                 <VoicePanel participants={participants} />
              </div>
            </div>
          </aside>
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

        {/* Toast Notification */}
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-6 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm">
            {toast}
          </div>
        </div>
      </main>
    </VoiceProvider>
  );
}
