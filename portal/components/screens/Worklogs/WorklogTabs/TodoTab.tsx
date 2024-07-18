import React, { useCallback } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { debounce } from "lodash";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { useAppDispatch } from "@/utils/redux/store";
import { ActionCreatorWithoutPayload } from "@reduxjs/toolkit";

export const MARKDOWN_PLACEHOLDER = `*`;

interface TodoTabsProps {
  userId: string;
  setLoading: (loading: boolean) => void;
  setMarkdownContent: (markdown: string) => void;
  mdRef: React.MutableRefObject<MDXEditorMethods | null>;
  setSaving: (save: boolean) => void;
  saving: boolean;
  loading: boolean;
  markdownContent: string;
  updateIncompleteTodos: ActionCreatorWithoutPayload<"laterTodos/updateIncompleteTodos">
}

const TodoTabs: React.FC<TodoTabsProps> = ({
  userId,
  setLoading,
  setMarkdownContent,
  mdRef,
  setSaving,
  saving,
  loading,
  markdownContent,
  updateIncompleteTodos
}) => {
  const dispatch = useAppDispatch();

  const fetchLaterToDo = (userId: string) => {
    setLoading(true);
    PortalSdk.getData(`/api/user/todolater?userId=${userId}`, null)
      .then((data) => {
        setLoading(data.data);
        setMarkdownContent(data.data?.markdown.content || "");
        mdRef?.current?.setMarkdown(data.data?.markdown.content || "");
        updateIncompleteTodos(data.data?.markdown.content || "");
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const saveMarkdownContent = useCallback(
    (content: string) => {
      setSaving(true);
      PortalSdk.putData(`/api/user/todolater`,
        {
          userId: userId,
          logType: "todoLater",
          markdown: { content: content },
      })
        .then((response) => {
          console.log("Markdown saved successfully", response);
        })
        .catch((error) => {
          console.error("Error saving markdown", error);
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [userId]
  );

  const debouncedSave = useCallback(
    debounce((content: string) => saveMarkdownContent(content), 3000),
    [saveMarkdownContent]
  );

  const handleMarkdownChange = (content: string) => {
    const emojiMap: { [key: string]: string } = {
      ":check:": "✅",
      ":cross:": "❌",
      ":yellow:": "🟡",
      ":red:": "🔴",
      ":calendar:": "📅",
      ":pencil:": "✏️",
      ":bulb:": "💡",
      ":question:": "❓",
      ":star:": "⭐",
    };

    let new_content = content;

    for (const text in emojiMap) {
      new_content = new_content.replaceAll(text, emojiMap[text]);
    }
    if (new_content.length === 0) {
      new_content = MARKDOWN_PLACEHOLDER;
    }
    mdRef?.current?.setMarkdown(new_content);
    setMarkdownContent(new_content);
    debouncedSave(new_content);
    dispatch(updateIncompleteTodos());
  };

  const getStatsOfContent = (content: string) => {
    const checks = (content.match(/✅/g) || []).length;
    const points = (content.match(/\n/g) || []).length + 1;
    return `${checks} / ${points}`;
  };

  return (
    <div>
      <div className="text-sm flex item-center gap-2 leading-3 mb-2 text-neutral-500">
        {(saving || loading) && (
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800"></div>
        )}
        Todo - {getStatsOfContent(markdownContent)} {" | "}
        {saving ? "saving..." : loading ? "fetching.." : "Saved"}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            console.log("Saving Worklogs");
            saveMarkdownContent(markdownContent);
          }
          if (e.ctrlKey && e.key === "r") {
            e.preventDefault();
            console.log("Refreshing Worklogs");
            fetchLaterToDo(userId);
          }
          if (e.ctrlKey && e.key === " ") {
            e.preventDefault();
            mdRef?.current?.insertMarkdown("✅");
          }
        }}
      >
        <MdxAppEditor
          ref={mdRef}
          key={`${userId}`}
          markdown={
            markdownContent.trim().length === 0
              ? MARKDOWN_PLACEHOLDER
              : markdownContent
          }
          className="flex-grow h-full"
          contentEditableClassName={`mdx_ce ${
            markdownContent.trim() == MARKDOWN_PLACEHOLDER.trim()
              ? " mdx_uninit "
              : ""
          } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleMarkdownChange}
        />
      </div>
    </div>
  );
};

export default TodoTabs;
