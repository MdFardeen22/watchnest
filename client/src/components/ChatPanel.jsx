import { useEffect, useRef, useState } from 'react';
import { useVoice } from '../contexts/voice.context.jsx';

export default function ChatPanel({ messages, onSendMessage }) {
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);
  const { muted, toggleMute, micStatus } = useVoice();

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedInput = chatInput.trim();
    if (!trimmedInput || trimmedInput.length > 300) {
      return;
    }

    onSendMessage(trimmedInput);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0 px-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">Room Chat</h2>
        <p className="mt-1 text-xs font-medium text-slate-500 transition-colors">Talk with your friends</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 custom-scrollbar transition-colors">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
            <div className="mb-2 text-3xl">💭</div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="rounded-2xl rounded-tl-sm border border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.03] p-3 shadow-sm transition-colors w-[90%] self-start">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {message.sender}
                  {message.isHost && (
                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 text-[8px] tracking-wide text-indigo-700 dark:text-indigo-300">
                      HOST
                    </span>
                  )}
                </p>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                {message.message}
              </p>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      <form className="mt-4 shrink-0 px-1 pb-2" onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={toggleMute}
            disabled={micStatus !== 'Connected'}
            className={`absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              muted 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            )}
          </button>
          <input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Type a message..."
            maxLength={300}
            className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 pl-[3.25rem] pr-14 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </form>
    </div>
  );
}
