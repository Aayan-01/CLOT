import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ChatMessage } from '../types';
import ProgressiveLoader from './ProgressiveLoader';

interface ChatBoxProps {
  sessionId: string;
}

// Utility function to parse markdown-like formatting
// Takes raw assistant text and removes headings, code fences, inline code, list markers
// then applies simple bold rendering.
const parseMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [text];

  // Remove fenced code blocks entirely
  let clean = text.replace(/```[\s\S]*?```/g, '');

  // Remove headers and leading list/blockquote markers
  clean = clean.replace(/^#{1,6}\s*/gm, '');
  clean = clean.replace(/^[-*+]\s*/gm, '');
  clean = clean.replace(/^>\s*/gm, '');

  // Remove inline code markers
  clean = clean.replace(/`([^`]*)`/g, '$1');

  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Match **text** for bold
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(clean)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(clean.substring(currentIndex, match.index));
    }
    // Add bolded text
    parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
    if (currentIndex < clean.length) {
      parts.push(clean.substring(currentIndex));
  }
  
  return parts.length > 0 ? parts : [clean];
};

// Format message with proper line breaks and markdown
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  
  return (
    <>
      {lines.map((line, idx) => {
        // Skip empty lines to reduce excess spacing
        if (line.trim().length === 0 && idx > 0 && idx < lines.length - 1) {
          return <div key={idx} className="h-2" />;
        }
        
        return (
          <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
            {parseMarkdown(line)}
          </p>
        );
      })}
    </>
  );
};

const ChatBox: React.FC<ChatBoxProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // quick health check to prevent proxy errors if backend isn't running
    try {
      // call backend directly to avoid vite proxy errors being logged
      await axios.get('http://localhost:4000/api/health', { timeout: 2000 });
    } catch (hErr) {
      const serverDownMsg: ChatMessage = {
        role: 'assistant',
        content: 'Backend server not reachable at http://localhost:4000 — please start the server with `cd server && npm run dev`.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, serverDownMsg]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post<{ response: string }>('/api/chat', {
        sessionId,
        message: input,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: (error?.code === 'ECONNREFUSED' || (error?.message || '').includes('ECONNREFUSED'))
          ? 'Could not reach the backend server (http://localhost:4000). Please start the server with `cd server && npm run dev` and try again.'
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <div className="space-y-4">
      <div className="h-96 overflow-y-auto bg-gray-900 rounded-lg p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Ask me anything about this item!</p>
            <p className="text-sm mt-2">
              Example: "What are the signs this might be fake?" or "How should I care for this?"
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="text-sm leading-relaxed">
                  <FormattedMessage content={msg.content} />
                </div>
                <p className="text-xs opacity-70 mt-2">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3">
              <ProgressiveLoader
                active={isLoading}
                compact
                steps={["Sending message", "Generating response"]}
                durationsMs={[400, 5000]}
              />
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
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;