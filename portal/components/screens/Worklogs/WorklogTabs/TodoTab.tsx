import React, { useCallback, useEffect, useRef, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { debounce } from "lodash";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  setCompletedTodos,
  setIncompleteTodos,
  setTodoMarkdown,
} from "@/utils/redux/worklogs/laterTodos.slice";

export const MARKDOWN_PLACEHOLDER = `*`;

interface TodoTabsProps {
  userId: string;
}

const TodoTabs: React.FC<TodoTabsProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  // moved the later todos logic to the parent component to render pulsating dot
  const { todoMarkdown, incompleteTodos, completedTodos } = useAppSelector(
    (state) => state.laterTodos
  );
  const mdRef = useRef<MDXEditorMethods | null>(null);

  const fetchLaterToDo = (userId: string) => {
    setLoading(true);
    PortalSdk.getData(`/api/user/todolater?userId=${userId}`, null)
      .then((data) => {
        const content = data?.data?.markdown?.content || "";
        dispatch(setTodoMarkdown(content));
        mdRef?.current?.setMarkdown(content);
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
      PortalSdk.putData(`/api/user/todolater`, {
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
    dispatch(setTodoMarkdown(content));
    debouncedSave(new_content);
  };

  useEffect(() => {
    if (userId) {
      fetchLaterToDo(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (todoMarkdown) {
      if (todoMarkdown.trim() === "*" || todoMarkdown.trim() === "") {
        dispatch(setIncompleteTodos(0));
      } else {
        const total = (todoMarkdown.match(/\n/g) || []).length + 1;
        const completed = (todoMarkdown.match(/✅/g) || []).length;
        dispatch(setIncompleteTodos(total - completed));
        dispatch(setCompletedTodos(completed));
      }
    }
  }, [todoMarkdown]);

  return (
    <div className="mt-4">
      <div className="text-sm flex item-center gap-2 leading-3 mb-2 text-neutral-500">
        {(saving || loading) && (
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800"></div>
        )}
        Todo - {`${completedTodos} / ${completedTodos + incompleteTodos}`}
        {" | "}
        {saving ? "saving..." : loading ? "fetching.." : "Saved"}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            console.log("Saving Worklogs");
            saveMarkdownContent(todoMarkdown);
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
          editorKey={`${userId}`}
          markdown={
            todoMarkdown.trim().length === 0
              ? MARKDOWN_PLACEHOLDER
              : todoMarkdown
          }
          className="flex-grow h-full"
          contentEditableClassName={`mdx_ce ${todoMarkdown.trim() == MARKDOWN_PLACEHOLDER.trim()
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
