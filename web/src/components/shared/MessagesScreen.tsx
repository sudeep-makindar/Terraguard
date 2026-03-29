import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

// Shared Messages component used by both Officer and Police
export function MessagesScreen({ myRole, myName }: { myRole: 'officer' | 'police'; myName: string }) {
  const { messages, sendMessage } = useAppStore();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(myRole, myName, text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="mb-4">
        <h2 className="text-white font-bold text-lg">Field Communications</h2>
        <p className="text-white/30 text-xs font-label">Shared thread: Forest Officer ↔ Police. Read-only for Court.</p>
      </div>
      <div className="flex-1 bg-[#111a19] border border-white/8 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => {
            const isMe = msg.author_role === myRole;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-3 rounded-2xl ${isMe
                  ? 'bg-primary/20 border border-primary/20 rounded-br-sm'
                  : 'bg-white/5 border border-white/8 rounded-bl-sm'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-label font-bold uppercase tracking-widest ${msg.author_role === 'officer' ? 'text-primary-container' : 'text-orange-400'}`}>
                      {msg.author_name}
                    </span>
                    {msg.alert_id && (
                      <span className="text-[9px] font-label text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full">{msg.alert_id}</span>
                    )}
                  </div>
                  <p className="text-white text-xs leading-relaxed">{msg.text}</p>
                  <p className="text-white/20 text-[9px] font-label mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/8 p-4 flex gap-3">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a field note..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary-container transition-colors" />
          <button onClick={handleSend}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-label font-bold hover:bg-primary/80 transition-all">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
