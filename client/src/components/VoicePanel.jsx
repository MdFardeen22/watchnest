import { useVoice } from '../contexts/voice.context.jsx';
import { useSocket } from '../contexts/socket.context.jsx';
import { useMemo } from 'react';

export default function VoicePanel({ participants }) {
  const { micStatus, muted, toggleMute, speakingPeers } = useVoice();
  const { socket } = useSocket();

  // Filter participants to those who are connected to voice (or show all and indicate voice status)
  // For simplicity, we just assume if they are in the participants list, they MIGHT be in voice.
  // Actually, we can use the `speakingPeers` keys to know who is connected!
  const connectedSocketIds = Object.keys(speakingPeers);

  return (
    <section className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
      <div className="mb-6 text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500 transition-colors">
            Voice
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">
            Voice Controls
          </h2>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
           <span className="relative flex h-3 w-3">
            {micStatus === 'Connected' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </>
            ) : micStatus === 'Connecting microphone...' ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 animate-pulse"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            )}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{micStatus}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-6 text-center shadow-inner transition-colors min-h-[200px]">
        {micStatus === 'Permission Denied' ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Please allow microphone access in your browser.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-5 flex items-center justify-center">
              {/* Local Speaking Indicator */}
              {speakingPeers['local'] && !muted && (
                 <div className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 scale-[2.5] animate-pulse"></div>
              )}
              <div className={`relative z-10 h-8 w-8 rounded-full transition-all duration-300 ${muted ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-110 flex items-center justify-center'}`}>
                {!muted && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                )}
                {muted && (
                  <svg className="w-4 h-4 text-white dark:text-slate-900 m-auto mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
                )}
              </div>
            </div>
            
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors">
              {muted ? 'Your microphone is currently muted' : 'Your microphone is active'}
            </p>
            <button
              type="button"
              onClick={toggleMute}
              disabled={micStatus !== 'Connected'}
              className={`mt-6 flex h-12 items-center justify-center rounded-xl px-8 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                muted 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200' 
                  : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white'
              }`}
            >
              {muted ? 'Unmute Microphone' : 'Mute Microphone'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Voice Participants</h3>
        <div className="flex flex-wrap gap-2">
          {participants.filter(p => connectedSocketIds.includes(p.id) || p.id === socket?.id).map(p => {
             const isSpeaking = p.id === socket?.id ? speakingPeers['local'] : speakingPeers[p.id];
             const isMuted = p.id === socket?.id ? muted : false; // We don't broadcast mute state right now, but we could. For now, rely on speaking.

             return (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isSpeaking && !isMuted ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.2)]' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20'}`}>
                 <span className={`h-2 w-2 rounded-full transition-colors ${isSpeaking && !isMuted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                 <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {p.name} {p.id === socket?.id && '(you)'}
                 </span>
              </div>
             )
          })}
        </div>
      </div>
    </section>
  );
}
