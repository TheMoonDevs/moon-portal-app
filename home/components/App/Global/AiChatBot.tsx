'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { BotMessageSquare, Loader2, Send, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FilloutFormIds, useFilloutPopup } from './FilloutPopup';
import { prettySinceTimeFromMillis } from '@/helpers/prettyprint';

const MAX_TOKENS = 5000;

export function AIChat() {
  const [showChat, setShowChat] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { openForm } = useFilloutPopup();

  const { messages, input, handleInputChange, handleSubmit, status, setMessages } =
    useChat({
      api: '/api/chat',
      initialMessages: [{
        id: `initial-message-1`,
        role: 'assistant', content: 'Hi there! What idea do you have in mind ? What do you wish to build ?'
      }],
      onFinish: (message, { usage, finishReason }) => {
        //console.log('Finished streaming message:', message);
        //console.log('Token usage:', usage, finishReason);

        if (!usage?.totalTokens) return;
        //tokenCount.current += usage.totalTokens;
        const prevUsage = localStorage.getItem(`chatbot-limit`) ?? "0";
        localStorage.setItem(`chatbot-limit`, (parseInt(prevUsage) + usage.totalTokens).toString());

        if (parseInt(prevUsage) >= MAX_TOKENS) {
          const lastMessage = messages[messages.length - 1];
          console.log('Last message:', lastMessage.content);
          if (lastMessage?.content !== 'limit-reached') {
            setMessages((ms) => (
              [
                ...ms,
                {
                  id: `limit-reached`,
                  role: 'assistant',
                  content: 'Hello! You have reached the limit for free chat consultation. Our live team will be happy to assist you. Please book a call for more details.',
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
                }
              ]
            ));
          }
        }


      },
      onError: (error) => {
        console.error('Error streaming message:', error);
      }
    });

  //Auto - scroll to the latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleMessageSubmit = (e: any) => {
    let usageAlready = parseInt(localStorage.getItem(`chatbot-limit`) ?? "0");
    let lastUsageUpdated = localStorage.getItem(`chatbot-last-updated`);
    if (lastUsageUpdated) {
      let lastUsageUpdatedDate = new Date(lastUsageUpdated);
      let currentDate = new Date();
      let diff = currentDate.getTime() - lastUsageUpdatedDate.getTime();
      if (diff > 24 * 60 * 60 * 1000) {
        usageAlready = 0;
        localStorage.setItem(`chatbot-limit`, usageAlready.toString());
        localStorage.setItem(`chatbot-last-updated`, currentDate.toISOString());
      }
    }
    console.log('Usage already:', usageAlready);
    if (usageAlready >= MAX_TOKENS) {
      setMessages((ms) => ([
        ...ms,
        {
          id: `user-message-${ms.length + 1}`,
          role: `user`,
          content: input,
        }
      ]));
      setMessages((ms) => ([
        ...ms,
        {
          id: `user-message-${ms.length + 1}`,
          role: 'assistant',
          content: 'Hello! You have reached the limit for free chat consultation for today. Our live team will be happy to assist you. Please book a call for more details.',
        }
      ]));
      setMessages((ms) => ([
        ...ms,
        {
          id: `limit-reached`,
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
        }
      ]));
      // append({
      //   role: 'assistant',
      //   content: '',
      //   parts: [
      //     {
      //       type: 'tool-invocation',
      //       toolInvocation: {
      //         toolName: 'limit-reached',
      //         state: 'result',
      //         result: {},
      //         toolCallId: 'limit-reached-1',
      //         args: {},
      //       },
      //     },
      //   ],
      // })
      e?.preventDefault();
    }
    else {
      handleSubmit(e, {
        data: {
          tokenUsage: usageAlready
        }
      })
    }

  }

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
        <div className="mt-4 w-96 rounded-3xl bg-black p-2 shadow-xl">
          {/* Chat Messages Container */}
          <div ref={chatContainerRef} className="mb-4 h-64 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-2 flex flex-row gap-2 w-3/4 rounded-3xl p-2 items-center 
                ${m.role != 'user'
                    ? 'justify-self-start text-left rounded-tr-none bg-neutral-900 text-white'
                    : 'justify-self-end justify-end text-right rounded-tl-none bg-neutral-800 text-white'
                  } ${m.id === 'limit-reached' ? ' !bg-black' : ''
                  }`}
              >
                {m.content && m.role && (
                  <div className='flex flex-col p-2 '>

                    <div className="rounded-lg text-sm text-inherit">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                    {m.createdAt && (
                      <span className="text-xs text-neutral-700">
                        {prettySinceTimeFromMillis(m.createdAt?.getTime() ?? 0)}
                      </span>)}
                  </div>
                )}
                {m.parts.map((part) => (
                  <div key={part.type}>
                    {part.type === 'tool-invocation' &&
                      part.toolInvocation.toolName === 'limit-reached' && (
                        <div>
                          <div className="bg- flex items-center gap-2">
                            <button
                              onClick={() => openForm(FilloutFormIds.BookCall)}
                              className="cursor-pointer rounded-lg bg-white p-2 font-semibold text-black hover:bg-gray-200"
                            >
                              Book a call for more details
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            ))}

            {status === 'submitted' && (
              <div className="flex items-center">
                <Loader2 className="animate-spin" size={16} />
              </div>
            )}
          </div>

          <form onSubmit={handleMessageSubmit} className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleMessageSubmit(null);
                }
              }}
              rows={4}
              className="w-full resize-none rounded-2xl border p-2 bg-neutral-900 text-white outline-none"
              placeholder="Type about your project..."
            />
            <button
              type="submit"
              className="absolute bottom-2 right-2 rounded p-2 text-neutral-500 hover:opacity-80"
            >
              <Send />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
