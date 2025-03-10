'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { BotMessageSquare, Loader2, Send, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FilloutFormIds, useFilloutPopup } from './FilloutPopup';

export function AIChat() {
  const [showChat, setShowChat] = useState(true);
  const tokenCount = useRef(0);
  const MAX_TOKENS = 1;
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, append } =
    useChat({
      api: '/api/chat',
      onFinish: (message, { usage }) => {
        console.log('Finished streaming message:', message);
        console.log('Token usage:', usage);

        if (usage?.totalTokens) {
          tokenCount.current += usage.totalTokens;
        }

        if (tokenCount.current >= MAX_TOKENS) {
          const lastMessage = messages[messages.length - 1];
          console.log('Last message:', lastMessage.content);
          if (lastMessage?.content !== 'limit-reached') {
            append({
              role: 'assistant',
              content: '',
              parts: [
                {
                  type: 'tool-invocation',
                  toolInvocation: {
                    toolName: 'limit-reached',
                    state: 'result',
                    result: {},
                    toolCallId: 'limit-reached-1',
                    args: {},
                  },
                },
              ],
            });
          }
        }
      },
      onError: (error) => {
        console.error('An error occurred:', error);
      },
    });

  const { openForm } = useFilloutPopup();

  // Auto-scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowChat(!showChat)}
        className={cn(
          'ml-auto rounded-full bg-black text-white',
          showChat ? 'float-right -mt-6 p-2' : 'p-4',
        )}
      >
        {showChat ? <X size={14} /> : <BotMessageSquare />}
      </button>

      {showChat && (
        <div className="mt-4 w-96 rounded-lg bg-black p-4 shadow-xl">
          {/* Chat Messages Container */}
          <div ref={chatContainerRef} className="mb-4 h-64 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className="mb-2 flex gap-2 rounded p-2 text-white"
              >
                {m.content && m.role && (
                  <>
                    <span className="font-bold">
                      {m.role === 'user' ? 'You: ' : '🤖: '}
                    </span>
                    <div className="w-full rounded-lg bg-neutral-200 p-2 text-sm text-black">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </>
                )}
                {m.parts.map((part) => (
                  <div key={part.type}>
                    {part.type === 'tool-invocation' &&
                      part.toolInvocation.toolName === 'limit-reached' && (
                        <div>
                          <div className="bg- flex items-center gap-2">
                            <span>🤖: </span>
                            <div
                              onClick={() => openForm(FilloutFormIds.BookCall)}
                              className="cursor-pointer rounded-lg bg-white p-2 font-semibold text-black hover:bg-gray-200"
                            >
                              Book a call for more details
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            ))}

            {status === 'submitted' && (
              <div className="flex items-center">
                <span>🤖: &nbsp;</span>
                <Loader2 className="animate-spin" size={16} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={4}
              className="w-full resize-none rounded border p-2 text-black outline-none"
              placeholder="Ask about your project..."
            />
            <button
              type="submit"
              className="absolute bottom-2 right-0 rounded p-2 text-black hover:opacity-80"
            >
              <Send />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
