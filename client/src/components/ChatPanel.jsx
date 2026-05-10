import { useEffect, useRef, useState } from 'react';

export default function ChatPanel({ messages, onSendMessage }) {
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

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
    <aside className="relative flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-500 h-[400px]">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors">Room Chat</h2>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-500 transition-colors">Talk with your friends</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/40 p-4 shadow-inner custom-scrollbar transition-colors">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
            <div className="mb-2 text-3xl">💭</div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.03] px-3.5 py-2.5 shadow-sm dark:shadow-none transition-colors">
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

      <form className="mt-4 flex shrink-0 gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="Type a message..."
          maxLength={300}
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
  );
}
