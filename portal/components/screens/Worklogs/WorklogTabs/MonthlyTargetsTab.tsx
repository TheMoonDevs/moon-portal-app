import type { MDXEditorMethods } from '@mdxeditor/editor';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setCompletedTargets,
  setIncompleteTargets,
  setTargetsMarkdown,
} from '@/utils/redux/worklogs/monthlyTargets.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

export const MARKDOWN_PLACEHOLDER = `*`;

interface MonthlyTargetsTabProps {
  userId: string;
  month: number;
  year: number;
}

const MonthlyTargetsTab: React.FC<MonthlyTargetsTabProps> = ({
  userId,
  month,
  year,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  // moved the monthly targets logic to the parent component to render pulsating dot
  const { targetsMarkdown, incompleteTargets, completedTargets } =
    useAppSelector((state) => state.monthlyTargets);
  const mdRef = useRef<MDXEditorMethods | null>(null);

  const fetchMonthlyTargets = (userId: string, month: number, year: number) => {
    setLoading(true);
    PortalSdk.getData(
      `/api/user/monthlytargets?userId=${userId}&month=${month}&year=${year}`,
      null,
    )
      .then((data) => {
        const content = data?.data?.markdown?.content || '';
        const finalContent = content || MARKDOWN_PLACEHOLDER;
        dispatch(setTargetsMarkdown(finalContent));
        mdRef?.current?.setMarkdown(finalContent);
      })
      .catch((err) => {
        // Handle network errors or other unexpected errors
        // Note: 404s are now handled by the API returning empty document
        console.error('Error fetching monthly targets:', err);
        const placeholder = MARKDOWN_PLACEHOLDER;
        dispatch(setTargetsMarkdown(placeholder));
        mdRef?.current?.setMarkdown(placeholder);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const saveMarkdownContent = useCallback(
    (content: string) => {
      if (!userId || month === undefined || year === undefined) {
        console.error('Cannot save: missing userId, month, or year', {
          userId,
          month,
          year,
        });
        return;
      }
      setSaving(true);
      const contentToSave = content || MARKDOWN_PLACEHOLDER;
      const payload = {
        userId: userId,
        logType: 'monthlyTargets',
        markdown: { content: contentToSave },
        month: Number(month), // Ensure it's a number
        year: Number(year), // Ensure it's a number
      };
      console.log('Saving monthly targets with payload:', payload);
      PortalSdk.putData(`/api/user/monthlytargets`, payload)
        .then((response) => {
          console.log('Markdown saved successfully', response);
          // Update Redux state with the saved content to ensure consistency
          if (response?.data?.markdown?.content) {
            dispatch(setTargetsMarkdown(response.data.markdown.content));
          }
        })
        .catch((error) => {
          console.error('Error saving markdown', error);
          // Log the full error for debugging
          if (error?.response || error?.data) {
            console.error('Error details:', error.response || error.data);
          }
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [userId, month, year, dispatch],
  );

  const debouncedSaveRef = useRef(
    debounce((content: string) => saveMarkdownContent(content), 3000),
  );

  // Update the debounced function when saveMarkdownContent changes
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
    // Update Redux with the emoji-replaced content (what we actually save)
    dispatch(setTargetsMarkdown(new_content));
    debouncedSaveRef.current(new_content);
  };

  useEffect(() => {
    if (userId) {
      // Cancel any pending debounced saves when month/year changes
      debouncedSaveRef.current.cancel();
      fetchMonthlyTargets(userId, month, year);
    }
    // Cleanup: cancel any pending saves when component unmounts or dependencies change
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [userId, month, year]);

  useEffect(() => {
    if (targetsMarkdown) {
      if (targetsMarkdown.trim() === '*' || targetsMarkdown.trim() === '') {
        dispatch(setIncompleteTargets(0));
      } else {
        const total = (targetsMarkdown.match(/\n/g) || []).length + 1;
        const completed = (targetsMarkdown.match(/✅/g) || []).length;
        dispatch(setIncompleteTargets(total - completed));
        dispatch(setCompletedTargets(completed));
      }
    }
  }, [targetsMarkdown, dispatch]);

  return (
    <div className="mt-4">
      <div className="item-center mb-2 flex gap-2 text-sm leading-3 text-neutral-500">
        {(saving || loading) && (
          <div className="size-3 animate-spin rounded-full border-y-2 border-neutral-800"></div>
        )}
        Targets -{' '}
        {`${completedTargets} / ${completedTargets + incompleteTargets}`}
        {' | '}
        {saving ? 'saving...' : loading ? 'fetching..' : 'Saved'}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            console.log('Saving Monthly Targets');
            saveMarkdownContent(targetsMarkdown);
          }
          if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            console.log('Refreshing Monthly Targets');
            fetchMonthlyTargets(userId, month, year);
          }
          if (e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            mdRef?.current?.insertMarkdown('✅');
          }
        }}
      >
        <MdxAppEditor
          ref={mdRef}
          key={`${userId}-${year}-${month}-monthly-targets`}
          editorKey={`${userId}-${year}-${month}-monthly-targets`}
          markdown={
            targetsMarkdown.trim().length === 0
              ? MARKDOWN_PLACEHOLDER
              : targetsMarkdown
          }
          className="h-full grow"
          contentEditableClassName={`mdx_ce ${
            targetsMarkdown.trim() == MARKDOWN_PLACEHOLDER.trim()
              ? ' mdx_uninit '
              : ''
          } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleMarkdownChange}
        />
      </div>
    </div>
  );
};

export default MonthlyTargetsTab;
