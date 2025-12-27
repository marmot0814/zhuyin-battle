import React, { useState, useEffect, useRef } from 'react';
import { formatLastOnline } from '../../../lib/utils';
import { api } from '../../../lib/api';

interface ChatWindowProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  chatFriend: any;
  user: any;
}

export default function ChatWindow({
  showChat,
  setShowChat,
  chatFriend,
  user
}: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat && chatFriend) {
      loadMessages();
      // Optional: Set up polling for new messages
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [showChat, chatFriend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function loadMessages() {
    if (!chatFriend) return;
    try {
      const res = await api(`/api/friends/messages/${chatFriend.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !chatFriend) return;
    
    try {
      const res = await api(`/api/friends/send-message/${chatFriend.id}`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage })
      });
      
      if (res.ok) {
        setNewMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  if (!showChat || !chatFriend) return null;

  // 格式化訊息時間
  function formatMessageTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return '剛剛';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-2xl h-[600px] border border-slate-700 shadow-2xl flex flex-col">
        {/* 聊天標題 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <img 
              src={chatFriend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatFriend.username}`}
              alt={chatFriend.username}
              className="w-10 h-10 rounded-full border-2 border-indigo-500"
            />
            <div>
              <h3 className="text-lg font-bold text-white">{chatFriend.username}</h3>
              <p className="text-xs text-slate-400">
                {chatFriend.seconds_offline < 30 
                  ? <span className="text-green-400">● 線上</span>
                  : formatLastOnline(chatFriend.seconds_offline)
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowChat(false);
              // setChatFriend(null); // Parent handles this if needed, or we just close
            }}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* 聊天訊息區域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>還沒有訊息</p>
              <p className="text-sm mt-1">開始聊天吧！</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-slate-500 mt-1 px-1">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 輸入區域 */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="輸入訊息..."
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-medium transition-colors"
            >
              發送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
