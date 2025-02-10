import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { DocMarkdown } from '@prisma/client';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { debounce } from 'lodash';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { decryptData, encryptData } from '@/utils/security/encryption';
import { toast } from 'sonner';
import { PassphraseVerification } from './PassphraseVerification';
import { usePassphrase } from '@/utils/hooks/usePassphrase';
import { cn } from '@/app/lib/utils';

const MARKDOWN_PLACEHOLDER = '*';

interface PrivateWorklogViewProps {
  date: string;
  logType?: string;
  visible?: boolean;
}

export const PrivateWorklogView: React.FC<PrivateWorklogViewProps> = ({
  date,
  logType = 'dayLog',
  visible = true,
}) => {
  const { user } = useUser();
  const [worklog, setWorklog] = useState<DocMarkdown | null>(null);
  const [content, setContent] = useState<string>(MARKDOWN_PLACEHOLDER);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const editorRef = useRef<MDXEditorMethods>(null);
  const { localPassphrase } = usePassphrase();
  const editorInstance = useRef<any | null>(null);

  const fetchWorklog = useCallback(async () => {
    if (!user?.id || !date) return;
    if (!localPassphrase) return;

    setLoading(true);
    try {
      const query = `?logType=${logType}&userId=${user.id}&date=${date}`;
      const { data } = await PortalSdk.getData(
        `/api/user/worklogs/private${query}`,
        null,
      );
      const decryptedContent = decryptData(
        data?.markdown?.content,
        localPassphrase,
      );
      setWorklog(data);
      setContent(decryptedContent || MARKDOWN_PLACEHOLDER);
      editorRef.current?.setMarkdown(decryptedContent || MARKDOWN_PLACEHOLDER);
    } catch (error: any) {
      console.error('Error fetching worklog:', error.message);
      if (error.error !== 'Document not found') {
        toast.error('Failed to fetch private worklog.');
      }
      setContent(MARKDOWN_PLACEHOLDER);
      editorRef.current?.setMarkdown(MARKDOWN_PLACEHOLDER);
    } finally {
      setLoading(false);
    }
  }, [user?.id, date, logType, localPassphrase]);

  useEffect(() => {
    if (user?.id) {
      fetchWorklog();
    }
  }, [user?.id, date, fetchWorklog, localPassphrase]);

  const saveWorklog = useCallback(
    async (newContent: string) => {
      if (!localPassphrase) return;
      if (!user?.id) return;
      setSaving(true);
      try {
        const encryptedContent = encryptData(newContent, localPassphrase);
        const decryptTest = decryptData(encryptedContent, localPassphrase);
        if (newContent != decryptTest) return;
        await PortalSdk.putData(`/api/user/worklogs/private`, {
          userId: user.id,
          logType: 'privateWorklogs',
          docId: worklog?.docId,
          markdown: { content: encryptedContent },
          date,
        });
        console.log('Worklog saved successfully');
      } catch (error) {
        console.error('Error saving worklog:', error);
        toast.error('Failed to save private worklog.');
      } finally {
        setSaving(false);
      }
    },
    [user?.id, worklog?.docId, date],
  );

  const debouncedSave = useCallback(debounce(saveWorklog, 1000), [saveWorklog]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      const emojiMap: { [key: string]: string } = {
        ':check:': '✅',
        ':cross:': '❌',
        ':yellow:': '🟡',
        ':red:': '🔴',
        ':calendar:': '📅',
        ':pencil:': '✏️',
        ':bulb:': '💡',
        ':question:': '❓',
        ':star:': '⭐',
      };

      let processedContent = newContent;
      for (const [text, emoji] of Object.entries(emojiMap)) {
        processedContent = processedContent.replaceAll(text, emoji);
      }

      if (processedContent.trim() === '') {
        processedContent = MARKDOWN_PLACEHOLDER;
      }

      setContent(processedContent);
      editorRef.current?.setMarkdown(processedContent);
      debouncedSave(processedContent);
    },
    [debouncedSave],
  );

  if (!visible) return null;
  // if (!localPassphrase) return <PassphraseVerification />;

  const formatText = (formatType: 'bold' | 'italic' | 'underline') => {
    if (!editorInstance.current) return;

    const selection = editorInstance.current.state.selection;

    if (!selection.empty) {
      const selectedText = editorInstance.current.state.doc.textBetween(
        selection.from,
        selection.to,
      );
      let newText = selectedText;

      switch (formatType) {
        case 'bold':
          newText = `**${selectedText}**`;
          break;
        case 'italic':
          newText = `*${selectedText}*`;
          break;
        case 'underline':
          newText = `<u>${selectedText}</u>`;
          break;
      }

      editorInstance.current.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: newText,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveWorklog(content);
    }
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      fetchWorklog();
    }
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.insertMarkdown('✅');
      }
    }
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.insertMarkdown('❌');
      }
    }
    if (e.ctrlKey && e.key === 'b' && editorInstance.current) {
      e.preventDefault();
      formatText('bold');
    }
    if (e.ctrlKey && e.key === 'i' && editorInstance.current) {
      e.preventDefault();
      formatText('italic');
    }
    if (e.ctrlKey && e.key === 'u' && editorInstance.current) {
      e.preventDefault();
      formatText('underline');
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorInstance.current = editorRef.current;
    }
  }, [editorRef]);

  return (
    <div className="relative px-4">
      <div className="flex flex-col gap-1">
        <span>
          <span className="font-bold">PRIVATE LOGS - </span>
          {saving ? 'Saving...' : loading ? 'Loading...' : 'Saved'}
        </span>
        <span className="mb-4 flex items-center gap-1 text-xs font-bold text-neutral-400">
          <span className="material-symbols-outlined !text-xs"> lock </span>
          <span> Private logs are encrypted and safely stored.</span>
        </span>
      </div>
      <div className={cn(!localPassphrase && 'blur-[3px]')}>
        <div className="mb-2 flex items-center gap-2 text-sm leading-3 text-neutral-500">
          {(saving || loading) && (
            <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-t-2 border-neutral-800" />
          )}
        </div>
        {localPassphrase && (
          <div onKeyDown={handleKeyDown}>
            <MdxAppEditor
              ref={editorRef}
              markdown={content}
              className="h-full flex-grow"
              placeholder="* Write your private logs here ..."
              contentEditableClassName={`mdx_ce ${content.trim() === MARKDOWN_PLACEHOLDER ? 'mdx_uninit' : ''} leading-1 imp-p-0 grow w-full h-full`}
              onChange={handleContentChange}
              key={user?.id + date}
              editorKey={''}
            />
          </div>
        )}
      </div>

      {!localPassphrase && <PassphraseVerification />}
    </div>
  );
};
