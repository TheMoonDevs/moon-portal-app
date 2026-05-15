import type { MDXEditorMethods } from '@mdxeditor/editor';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setAdminTasksMarkdown,
  setCompletedTasks,
  setIncompleteTasks,
} from '@/utils/redux/worklogs/adminTasks.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

export const MARKDOWN_PLACEHOLDER = `*`;

interface AdminTasksTabProps {
  userId: string;
}

const AdminTasksTab: React.FC<AdminTasksTabProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const { adminTasksMarkdown, incompleteTasks, completedTasks } =
    useAppSelector((state) => state.adminTasks);
  const mdRef = useRef<MDXEditorMethods | null>(null);

  const fetchAdminTasks = (userId: string) => {
    if (!userId) return;
    setLoading(true);
    PortalSdk.getData(`/api/user/admintasks?userId=${userId}`, null)
      .then((data) => {
        const content = data?.data?.markdown?.content || '';
        const finalContent = content || MARKDOWN_PLACEHOLDER;
        dispatch(setAdminTasksMarkdown(finalContent));
        mdRef?.current?.setMarkdown(finalContent);
      })
      .catch((err) => {
        console.error('Error fetching admin tasks:', err);
        const placeholder = MARKDOWN_PLACEHOLDER;
        dispatch(setAdminTasksMarkdown(placeholder));
        mdRef?.current?.setMarkdown(placeholder);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const saveMarkdownContent = useCallback(
    (content: string) => {
      if (!userId) {
        console.error('Cannot save: userId is missing');
        return;
      }
      setSaving(true);
      const contentToSave = content || MARKDOWN_PLACEHOLDER;
      PortalSdk.putData(`/api/user/admintasks`, {
        userId: userId,
        logType: 'adminTasks',
        markdown: { content: contentToSave },
      })
        .then((response) => {
          console.log('Admin tasks saved successfully', response);
          if (response?.data?.markdown?.content) {
            dispatch(setAdminTasksMarkdown(response.data.markdown.content));
          }
        })
        .catch((error) => {
          console.error('Error saving admin tasks', error);
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [userId, dispatch],
  );

  const debouncedSaveRef = useRef(
    debounce((content: string) => saveMarkdownContent(content), 3000),
  );

  useEffect(() => {
    debouncedSaveRef.current = debounce(
      (content: string) => saveMarkdownContent(content),
      3000,
    );
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [saveMarkdownContent]);

  const handleMarkdownChange = (content: string) => {
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

    let new_content = content;

    for (const text in emojiMap) {
      new_content = new_content.replaceAll(text, emojiMap[text]);
    }
    if (new_content.length === 0) {
      new_content = MARKDOWN_PLACEHOLDER;
    }
    dispatch(setAdminTasksMarkdown(new_content));
    debouncedSaveRef.current(new_content);
  };

  useEffect(() => {
    if (userId) {
      fetchAdminTasks(userId);
    }
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [userId]);

  useEffect(() => {
    if (adminTasksMarkdown) {
      if (
        adminTasksMarkdown.trim() === '*' ||
        adminTasksMarkdown.trim() === ''
      ) {
        dispatch(setIncompleteTasks(0));
      } else {
        const total = (adminTasksMarkdown.match(/\n/g) || []).length + 1;
        const completed = (adminTasksMarkdown.match(/✅/g) || []).length;
        dispatch(setIncompleteTasks(total - completed));
        dispatch(setCompletedTasks(completed));
      }
    }
  }, [adminTasksMarkdown, dispatch]);

  return (
    <div className="mt-4">
      <div className="item-center mb-2 flex gap-2 text-sm leading-3 text-neutral-500">
        {(saving || loading) && (
          <div className="size-3 animate-spin rounded-full border-y-2 border-neutral-800"></div>
        )}
        Admin Tasks -{' '}
        {`${completedTasks} / ${completedTasks + incompleteTasks}`}
        {' | '}
        {saving ? 'saving...' : loading ? 'fetching..' : 'Saved'}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            console.log('Saving Admin Tasks');
            saveMarkdownContent(adminTasksMarkdown);
          }
          if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            console.log('Refreshing Admin Tasks');
            fetchAdminTasks(userId);
          }
          if (e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            mdRef?.current?.insertMarkdown('✅');
          }
        }}
      >
        <MdxAppEditor
          ref={mdRef}
          key={`${userId}-admin-tasks`}
          editorKey={`${userId}-admin-tasks`}
          markdown={
            adminTasksMarkdown.trim().length === 0
              ? MARKDOWN_PLACEHOLDER
              : adminTasksMarkdown
          }
          className="h-full grow"
          contentEditableClassName={`mdx_ce ${
            adminTasksMarkdown.trim() == MARKDOWN_PLACEHOLDER.trim()
              ? ' mdx_uninit '
              : ''
          } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleMarkdownChange}
        />
      </div>
    </div>
  );
};

export default AdminTasksTab;
