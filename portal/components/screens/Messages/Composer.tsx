'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import type { ChatMessage } from './api';
import { previewOf } from './format';
import { floatingPanel, Icon, menuItem, RoundButton } from './parts';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const DRAFT_KEY = 'portal.chat.drafts';

const readDrafts = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveDraft = (conversationId: string, text: string) => {
  try {
    const drafts = readDrafts();
    if (text.trim()) drafts[conversationId] = text;
    else delete drafts[conversationId];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    /* storage is optional */
  }
};

const isTouch = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

/** The message box: text, emoji, attachments, reply and edit bars. */
export const Composer = ({
  conversationId,
  me,
  partnerName,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSend,
  onSaveEdit,
  onPickFiles,
  onTyping,
}: {
  conversationId: string;
  me: string | null;
  partnerName: string;
  replyTo: ChatMessage | null;
  editing: ChatMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (text: string) => void;
  onSaveEdit: (text: string) => void;
  onPickFiles: (files: File[]) => void;
  onTyping: () => void;
}) => {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // Each chat keeps its own unsent text.
  useEffect(() => {
    setText(readDrafts()[conversationId] ?? '');
    setEmojiOpen(false);
  }, [conversationId]);

  useEffect(() => {
    if (editing) {
      setText(editing.text);
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  const update = (value: string) => {
    setText(value);
    if (!editing) saveDraft(conversationId, value);
    if (value.trim()) onTyping();
  };

  const submit = () => {
    const value = text.trim();
    if (editing) {
      if (value !== editing.text.trim()) onSaveEdit(value);
      else onCancelEdit();
      setText(readDrafts()[conversationId] ?? '');
      return;
    }
    if (!value) return;
    onSend(value);
    setText('');
    saveDraft(conversationId, '');
    inputRef.current?.focus();
  };

  const pick = (files: FileList | null) => {
    if (files?.length) onPickFiles(Array.from(files));
  };

  return (
    <div className="relative shrink-0 border-t border-white/[0.06] bg-neutral-950 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 auto-light:border-black/[0.06] auto-light:bg-neutral-100">
      {emojiOpen && (
        <div className="absolute bottom-full left-2 z-20 mb-2">
          <EmojiPicker
            lazyLoadEmojis
            width={320}
            height={380}
            previewConfig={{ showPreview: false }}
            onEmojiClick={(e) => update(text + e.emoji)}
          />
        </div>
      )}

      {(replyTo || editing) && (
        <div className="mx-1 mb-2 flex items-start gap-2 rounded-lg border-l-4 border-sky-400 bg-white/[0.05] px-3 py-2 text-sm auto-light:bg-black/[0.04]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sky-300 auto-light:text-sky-700">
              {editing
                ? 'Edit message'
                : replyTo!.senderId === me
                  ? 'Replying to yourself'
                  : `Replying to ${partnerName}`}
            </p>
            <p className="truncate text-neutral-400 auto-light:text-neutral-600">
              {previewOf((editing ?? replyTo)!)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => {
              if (editing) {
                onCancelEdit();
                setText(readDrafts()[conversationId] ?? '');
              } else onCancelReply();
            }}
            className="text-[20px] text-neutral-400"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1">
        <RoundButton
          icon="mood"
          label="Emoji"
          active={emojiOpen}
          onClick={() => setEmojiOpen((open) => !open)}
        />
        {!editing && (
          <Menu.Root modal={false}>
            <Menu.Trigger asChild>
              <button
                type="button"
                aria-label="Attach"
                title="Attach"
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-[22px] text-neutral-400 hover:bg-white/[0.07] hover:text-neutral-100 auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05]"
              >
                <Icon name="attach_file" className="rotate-45" />
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content
                side="top"
                align="start"
                sideOffset={6}
                className={cn(floatingPanel, 'w-52 py-1')}
              >
                <Menu.Item
                  className={menuItem}
                  onSelect={() => mediaInput.current?.click()}
                >
                  <Icon
                    name="photo_library"
                    className="text-[20px] text-sky-400"
                  />{' '}
                  Photos and videos
                </Menu.Item>
                <Menu.Item
                  className={menuItem}
                  onSelect={() => cameraInput.current?.click()}
                >
                  <Icon
                    name="photo_camera"
                    className="text-[20px] text-rose-400"
                  />{' '}
                  Camera
                </Menu.Item>
                <Menu.Item
                  className={menuItem}
                  onSelect={() => docInput.current?.click()}
                >
                  <Icon
                    name="description"
                    className="text-[20px] text-violet-400"
                  />{' '}
                  Document
                </Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        )}
        <input
          ref={mediaInput}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={docInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => update(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isTouch()) {
              e.preventDefault();
              submit();
            }
            if (e.key === 'Escape') {
              if (editing) onCancelEdit();
              else if (replyTo) onCancelReply();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length && !editing) {
              e.preventDefault();
              onPickFiles(files);
            }
          }}
          placeholder="Message"
          className="quiet-scrollbar min-h-10 flex-1 resize-none rounded-2xl bg-white/[0.07] px-4 py-2.5 text-[15px] leading-5 text-neutral-100 outline-none placeholder:text-neutral-500 auto-light:bg-white auto-light:text-neutral-900"
        />

        <button
          type="button"
          aria-label={editing ? 'Save' : 'Send'}
          onClick={submit}
          disabled={!text.trim() && !editing}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[22px] text-neutral-950 transition-opacity hover:bg-emerald-400 disabled:opacity-40"
        >
          <Icon name={editing ? 'check' : 'send'} filled />
        </button>
      </div>
    </div>
  );
};
