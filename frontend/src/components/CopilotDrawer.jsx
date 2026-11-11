// frontend/src/components/CopilotDrawer.jsx
import React, { useRef, useEffect } from 'react';
import RingSpinner from './RingSpinner';

export default function CopilotDrawer({
  isOpen,
  setIsOpen,
  isExpanded,
  setIsExpanded,
  messages,
  input,
  setInput,
  loading,
  onSendMessage,
  onClearHistory
}) {
  const chatScrollRef = useRef(null);

  // Auto-scroll to bottom of chat when new messages arrive or drawer resizes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isExpanded, loading]);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    onSendMessage();
  }

  return (
    <>
      {/* Background Blur Overlay when Copilot is Expanded into Workspace View */}
      {isOpen && isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 transition-opacity duration-300 animate-fadeIn"
          title="Click backdrop to shrink Copilot"
        />
      )}

      {/* Floating Widget Container */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center gap-2.5 active:scale-95 transition-all duration-200 group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">🤖</span>
            <span className="tracking-tight">Ask AI Copilot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        ) : (
          <div
            className={`bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded
                ? 'w-[750px] max-w-[calc(100vw-2.5rem)] h-[82vh] max-h-[820px]'
                : 'w-96 max-w-[calc(100vw-2rem)] h-[520px]'
            }`}
          >
            {/* Copilot Header */}
            <div className="p-4 border-b border-indigo-500/30 bg-indigo-600/95 dark:bg-indigo-600/90 backdrop-blur-md text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-base">
                  🤖
                </span>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight tracking-tight">PayClear Copilot</h4>
                  <span className="text-[10px] text-indigo-100 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Real-time ledger context active</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Clear Chat Button */}
                {onClearHistory && messages.length > 1 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Clear your chat history"
                  >
                    <span>🗑️</span>
                    <span className="text-[10px] hidden sm:inline">Clear</span>
                  </button>
                )}

                {/* Expand / Shrink Size Toggle */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold"
                  title={isExpanded ? "Shrink Chat View" : "Enlarge Chat View"}
                >
                  {isExpanded ? '🗗' : '⛶'}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsExpanded(false);
                  }}
                  className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors text-base font-bold"
                  title="Close Copilot"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Prompt Badges */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#070D18] flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => onSendMessage("Which invoices are still unpaid?")}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition-colors font-medium text-[11px]"
              >
                Who owes me?
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("How much did PayPal take in fees total?")}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition-colors font-medium text-[11px]"
              >
                Total fees?
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("Explain the Nexus Holdings transaction.")}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition-colors font-medium text-[11px]"
              >
                Explain Nexus
              </button>
            </div>

            {/* Messages Container */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div
                    className={`max-w-[85%] p-3.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-br-none shadow-md shadow-indigo-600/20 font-medium'
                        : 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-none border border-slate-200/80 dark:border-slate-700/80 shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="p-3 bg-white dark:bg-[#1E293B] rounded-2xl rounded-bl-none border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 shadow-sm">
                    <RingSpinner size={13} className="text-indigo-500" />
                    <span>Analyzing your ledger context…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A] flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Ask about your invoices, PayPal fees, or clients…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 active:scale-95 shadow-sm"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
