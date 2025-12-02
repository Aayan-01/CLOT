import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ChatMessage } from '../types';
import ProgressiveLoader from './ProgressiveLoader';

interface ChatbotProps {
  sessionId: string;
}

const parseMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [text];

  let clean = text.replace(/```[\s\S]*?```/g, '');
  clean = clean.replace(/^#{1,6}\s*/gm, '');
  clean = clean.replace(/^[-*+]\s*/gm, '');
  clean = clean.replace(/^>\s*/gm, '');
  clean = clean.replace(/`([^`]*)`/g, '$1');

  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(clean)) !== null) {
    if (match.index > currentIndex) parts.push(clean.substring(currentIndex, match.index));
    parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < clean.length) parts.push(clean.substring(currentIndex));
  return parts.length > 0 ? parts : [clean];
};

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, idx) => {
        if (line.trim().length === 0 && idx > 0 && idx < lines.length - 1) return <div key={idx} className="h-2" />;
        return (
          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
            {parseMarkdown(line)}
          </p>
        );
      })}
    </>
  );
};

const Chatbot: React.FC<ChatbotProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const API_ORIGIN = (import.meta as any).env?.VITE_API_ORIGIN ?? ((import.meta as any).env?.DEV ? 'http://localhost:4000' : window.location.origin);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages((s) => [...s, userMessage]);
    setInput('');
    setIsLoading(true);

    // health check like older ChatBox logic
    try {
      await axios.get(`${API_ORIGIN}/api/health`, { timeout: 2000 });
    } catch (hErr) {
      setMessages((s) => [...s, { role: 'assistant', content: `Backend server not reachable at ${API_ORIGIN} — please verify your deployment or start the server locally with \`cd server && npm run dev\`.`, timestamp: new Date() }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post<{ response: string }>(`${API_ORIGIN}/api/chat`, { sessionId, message: input });
      setMessages((s) => [...s, { role: 'assistant', content: response.data.response, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages((s) => [...s, { role: 'assistant', content: (err?.code === 'ECONNREFUSED' || (err?.message || '').includes('ECONNREFUSED')) ? `Could not reach the backend server (${API_ORIGIN}). Please start the server with \`cd server && npm run dev\` and try again.` : 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4 bg-white rounded-xl p-4">
      <div className="h-96 overflow-y-auto rounded-lg p-4 border border-gray-100">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Ask me anything about this item!</p>
            <p className="text-sm mt-2 text-gray-400">Example: "What are the signs this might be fake?"</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-50 border border-gray-100 text-gray-900'}`}>
                <div className="text-sm leading-relaxed"><FormattedMessage content={msg.content} /></div>
                <p className="text-xs opacity-70 mt-2 text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <ProgressiveLoader active compact steps={["Sending message", "Generating response"]} durationsMs={[400, 5000]} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about this item..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-black hover:bg-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
