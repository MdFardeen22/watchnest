import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from './socket.context.jsx';

const VoiceContext = createContext(undefined);

export function VoiceProvider({ children, roomCode }) {
  const { socket, connected } = useSocket();
  const [micStream, setMicStream] = useState(null);
  const [micStatus, setMicStatus] = useState('Connecting microphone...');
  const [muted, setMuted] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState({});
  const peersRef = useRef({}); // mapping of socketId to Peer instance
  const streamsRef = useRef({}); // mapping of socketId to remote stream
  const audioElementsRef = useRef({}); // invisible audio elements to play remote streams
  
  const analyserContextRef = useRef(null);
  const analysersRef = useRef({});
  const speakingIntervalRef = useRef(null);

  // Initialize Microphone
  useEffect(() => {
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMicStream(stream);
        setMicStatus('Connected');
      } catch (err) {
        console.error('[voice] mic permission denied', err);
        setMicStatus('Permission Denied');
      }
    }
    initMic();

    return () => {
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Mute
  useEffect(() => {
    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted, micStream]);

  // Speaking indicator logic (checks volume level of remote streams and local stream)
  useEffect(() => {
    if (!micStream) return;

    if (!analyserContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      analyserContextRef.current = new AudioContext();
    }

    const ctx = analyserContextRef.current;
    
    function attachAnalyser(id, stream) {
      if (!stream) return;
      try {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        analysersRef.current[id] = analyser;
      } catch (e) {
        console.error('[voice] Error attaching analyser', e);
      }
    }

    // Attach for local mic
    attachAnalyser('local', micStream);

    speakingIntervalRef.current = setInterval(() => {
      setSpeakingPeers((prev) => {
        const next = { ...prev };
        let changed = false;

        Object.entries(analysersRef.current).forEach(([id, analyser]) => {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          
          const isSpeaking = avg > 15; // Threshold for speaking
          if (next[id] !== isSpeaking) {
            next[id] = isSpeaking;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 150);

    return () => {
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
    };
  }, [micStream]);

  // WebRTC Signaling Logic
  useEffect(() => {
    if (!socket || !connected || !micStream || !roomCode) return;

    socket.emit('join-voice');

    function createPeer(targetSocketId, initiator, stream) {
      const peer = new Peer({
        initiator,
        stream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peer.on('signal', (signal) => {
        if (signal.type === 'offer') {
          socket.emit('voice-offer', { targetId: targetSocketId, offer: signal });
        } else if (signal.type === 'answer') {
          socket.emit('voice-answer', { targetId: targetSocketId, answer: signal });
        } else if (signal.candidate) {
          socket.emit('ice-candidate', { targetId: targetSocketId, candidate: signal });
        }
      });

      peer.on('stream', (remoteStream) => {
        streamsRef.current[targetSocketId] = remoteStream;
        
        // Play audio
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audioElementsRef.current[targetSocketId] = audio;

        // Attach analyser for speaking indicator
        if (analyserContextRef.current) {
          try {
            const source = analyserContextRef.current.createMediaStreamSource(remoteStream);
            const analyser = analyserContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);
            analysersRef.current[targetSocketId] = analyser;
          } catch (e) {
             console.error('[voice] Error attaching remote analyser', e);
          }
        }
      });

      peer.on('close', () => destroyPeer(targetSocketId));
      peer.on('error', () => destroyPeer(targetSocketId));

      return peer;
    }

    function destroyPeer(targetSocketId) {
      if (peersRef.current[targetSocketId]) {
        peersRef.current[targetSocketId].destroy();
        delete peersRef.current[targetSocketId];
      }
      if (audioElementsRef.current[targetSocketId]) {
        audioElementsRef.current[targetSocketId].pause();
        audioElementsRef.current[targetSocketId].srcObject = null;
        delete audioElementsRef.current[targetSocketId];
      }
      if (streamsRef.current[targetSocketId]) {
        delete streamsRef.current[targetSocketId];
      }
      if (analysersRef.current[targetSocketId]) {
        delete analysersRef.current[targetSocketId];
      }
      setSpeakingPeers((prev) => {
        const next = { ...prev };
        delete next[targetSocketId];
        return next;
      });
    }

    function handleUserJoined({ socketId }) {
      // New user joined, we initiate the connection to them
      console.info(`[voice] Peer joined: ${socketId}, creating initiator`);
      const peer = createPeer(socketId, true, micStream);
      peersRef.current[socketId] = peer;
    }

    function handleOffer({ socketId, offer }) {
      console.info(`[voice] Received offer from: ${socketId}`);
      const peer = createPeer(socketId, false, micStream);
      peersRef.current[socketId] = peer;
      peer.signal(offer);
    }

    function handleAnswer({ socketId, answer }) {
      console.info(`[voice] Received answer from: ${socketId}`);
      const peer = peersRef.current[socketId];
      if (peer) {
        peer.signal(answer);
      }
    }

    function handleIceCandidate({ socketId, candidate }) {
      const peer = peersRef.current[socketId];
      if (peer) {
        peer.signal(candidate);
      }
    }

    function handleUserLeft({ socketId }) {
      console.info(`[voice] Peer left: ${socketId}`);
      destroyPeer(socketId);
    }

    socket.on('user-joined-voice', handleUserJoined);
    socket.on('voice-offer', handleOffer);
    socket.on('voice-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left-voice', handleUserLeft);

    return () => {
      socket.emit('leave-voice');
      socket.off('user-joined-voice', handleUserJoined);
      socket.off('voice-offer', handleOffer);
      socket.off('voice-answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left-voice', handleUserLeft);

      Object.keys(peersRef.current).forEach(destroyPeer);
    };
  }, [socket, connected, micStream, roomCode]);

  function toggleMute() {
    setMuted((m) => !m);
  }

  const value = {
    micStream,
    micStatus,
    muted,
    toggleMute,
    speakingPeers, // Record<socketId | 'local', boolean>
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
}
