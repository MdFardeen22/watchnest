import { useVoice } from '../contexts/voice.context.jsx';
import { useSocket } from '../contexts/socket.context.jsx';

export default function PeoplePanel({ participants }) {
  const { speakingPeers, muted } = useVoice();
  const { socket } = useSocket();

  function getInitials(name) {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-2 md:mb-4 shrink-0 px-1">
        <h2 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">Participants</h2>
        <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-medium text-slate-500 transition-colors">
          {participants.length} online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-2 md:space-y-3 pb-4 min-h-0">
        {participants.map((participant) => {
          const isMe = participant.id === socket?.id;
          const isSpeaking = isMe ? speakingPeers['local'] : speakingPeers[participant.id];
          const isMuted = isMe ? muted : !participant.micEnabled; // Wait, actually participant.micEnabled comes from the server. But for voice, we primarily rely on isSpeaking for visual feedback since we don't sync mute state accurately yet.

          return (
            <div
              key={participant.id}
              className={`group flex items-center justify-between rounded-xl md:rounded-2xl border p-2 md:p-3 transition-all duration-300 ${
                isSpeaking && !isMuted
                  ? 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0">
                <div className="relative shrink-0">
                  {/* Avatar with Glow if speaking */}
                  {isSpeaking && !isMuted && (
                    <div className="absolute inset-0 rounded-full bg-indigo-500/40 blur-md animate-pulse"></div>
                  )}
                  <div className={`relative z-10 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-[10px] md:text-xs font-bold text-white shadow-sm transition-all duration-300 ${isSpeaking && !isMuted ? 'bg-indigo-500 scale-105' : 'bg-slate-400 dark:bg-slate-700'}`}>
                    {getInitials(participant.name)}
                  </div>
                  
                  {/* Mic Status Badge */}
                  <div className={`absolute -bottom-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-[#08090d] ${isMuted ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {isMuted ? (
                      <svg className="h-2 w-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 6L6 18M6 6l12 12"></path></svg>
                    ) : (
                      <svg className="h-2 w-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    )}
                  </div>
                </div>

                <div className="flex flex-col truncate min-w-0">
                  <span className="truncate text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-colors">
                    {participant.name} {isMe && <span className="text-slate-400 dark:text-slate-500 font-normal">(you)</span>}
                  </span>
                  {participant.isHost ? (
                    <span className="mt-0.5 w-max rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
                      Host
                    </span>
                  ) : (
                    <span className="mt-0.5 w-max rounded-full bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase border border-slate-200 dark:border-white/5">
                      Member
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
