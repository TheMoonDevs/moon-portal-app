import React, { useCallback, useEffect, useRef, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { debounce } from "lodash";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  setCompletedTasks,
  setIncompleteTasks,
  setAdminTasksMarkdown,
} from "@/utils/redux/worklogs/adminTasks.slice";

export const MARKDOWN_PLACEHOLDER = `*`;

const AdminTasksTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const { adminTasksMarkdown, incompleteTasks, completedTasks } = useAppSelector(
    (state) => state.adminTasks
  );
  const mdRef = useRef<MDXEditorMethods | null>(null);

  const fetchAdminTasks = () => {
    setLoading(true);
    PortalSdk.getData(`/api/user/admintasks`, null)
      .then((data) => {
        const content = data?.data?.markdown?.content || "";
        const finalContent = content || MARKDOWN_PLACEHOLDER;
        dispatch(setAdminTasksMarkdown(finalContent));
        mdRef?.current?.setMarkdown(finalContent);
      })
      .catch((err) => {
        console.error("Error fetching admin tasks:", err);
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
      setSaving(true);
      const contentToSave = content || MARKDOWN_PLACEHOLDER;
      PortalSdk.putData(`/api/user/admintasks`, {
        logType: "adminTasks",
        markdown: { content: contentToSave },
      })
        .then((response) => {
          console.log("Admin tasks saved successfully", response);
          if (response?.data?.markdown?.content) {
            dispatch(setAdminTasksMarkdown(response.data.markdown.content));
          }
        })
        .catch((error) => {
          console.error("Error saving admin tasks", error);
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [dispatch]
  );

  const debouncedSaveRef = useRef(
    debounce((content: string) => saveMarkdownContent(content), 3000)
  );

  useEffect(() => {
    debouncedSaveRef.current = debounce(
      (content: string) => saveMarkdownContent(content),
      3000
    );
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [saveMarkdownContent]);

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
    dispatch(setAdminTasksMarkdown(new_content));
    debouncedSaveRef.current(new_content);
  };

  useEffect(() => {
    fetchAdminTasks();
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (adminTasksMarkdown) {
      if (adminTasksMarkdown.trim() === "*" || adminTasksMarkdown.trim() === "") {
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
      <div className="text-sm flex item-center gap-2 leading-3 mb-2 text-neutral-500">
        {(saving || loading) && (
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800"></div>
        )}
        Admin Tasks - {`${completedTasks} / ${completedTasks + incompleteTasks}`}
        {" | "}
        {saving ? "saving..." : loading ? "fetching.." : "Saved"}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            console.log("Saving Admin Tasks");
            saveMarkdownContent(adminTasksMarkdown);
          }
          if (e.ctrlKey && e.key === "r") {
            e.preventDefault();
            console.log("Refreshing Admin Tasks");
            fetchAdminTasks();
          }
          if (e.ctrlKey && e.key === " ") {
            e.preventDefault();
            mdRef?.current?.insertMarkdown("✅");
          }
        }}
      >
        <MdxAppEditor
          ref={mdRef}
          key="admin-tasks"
          editorKey="admin-tasks"
          markdown={
            adminTasksMarkdown.trim().length === 0
              ? MARKDOWN_PLACEHOLDER
              : adminTasksMarkdown
          }
          className="flex-grow h-full"
          contentEditableClassName={`mdx_ce ${adminTasksMarkdown.trim() == MARKDOWN_PLACEHOLDER.trim()
            ? " mdx_uninit "
            : ""
            } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleMarkdownChange}
        />
      </div>
    </div>
  );
};

export default AdminTasksTab;
