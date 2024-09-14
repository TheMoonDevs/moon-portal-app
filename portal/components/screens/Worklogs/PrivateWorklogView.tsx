import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { DocMarkdown } from "@prisma/client";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { debounce } from "lodash";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { decryptData, encryptData } from "@/utils/privacy/encryption";

const MARKDOWN_PLACEHOLDER = "*";

interface PrivateWorklogViewProps {
  date: string;
  logType?: string;
  localPassphrase: string;
  visible?: boolean;
}

export const PrivateWorklogView: React.FC<PrivateWorklogViewProps> = ({
  date,
  logType = "dayLog",
  localPassphrase,
  visible = true,
}) => {
  const { user } = useUser();
  const [worklog, setWorklog] = useState<DocMarkdown | null>(null);
  const [content, setContent] = useState<string>(MARKDOWN_PLACEHOLDER);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const editorRef = useRef<MDXEditorMethods>(null);

  const fetchWorklog = useCallback(async () => {
    if (!user?.id || !date) return;

    setLoading(true);
    try {
      const query = `?logType=${logType}&userId=${user.id}&date=${date}`;
      const { data } = await PortalSdk.getData(
        `/api/user/worklogs/private${query}`,
        null
      );
      const decryptedContent = decryptData(
        data?.markdown?.content,
        localPassphrase
      );

      setWorklog(data);
      setContent(decryptedContent || MARKDOWN_PLACEHOLDER);
      editorRef.current?.setMarkdown(decryptedContent || MARKDOWN_PLACEHOLDER);
    } catch (error) {
      console.error("Error fetching worklog:", error);
      setContent(MARKDOWN_PLACEHOLDER);
      editorRef.current?.setMarkdown(MARKDOWN_PLACEHOLDER);
    } finally {
      setLoading(false);
    }
  }, [user?.id, date, logType, localPassphrase]);

  const saveWorklog = useCallback(
    async (newContent: string) => {
      if (!user?.id) return;

      setSaving(true);
      try {
        const encryptedContent = encryptData(newContent, localPassphrase);
        await PortalSdk.putData(`/api/user/worklogs/private`, {
          userId: user.id,
          logType: "privateWorklogs",
          docId: worklog?.docId,
          markdown: { content: encryptedContent },
          date,
        });
        console.log("Worklog saved successfully");
      } catch (error) {
        console.error("Error saving worklog:", error);
      } finally {
        setSaving(false);
      }
    },
    [user?.id, worklog?.docId, date, localPassphrase]
  );

  const debouncedSave = useCallback(debounce(saveWorklog, 1000), [saveWorklog]);

  const handleContentChange = useCallback(
    (newContent: string) => {
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

      let processedContent = newContent;
      for (const [text, emoji] of Object.entries(emojiMap)) {
        processedContent = processedContent.replaceAll(text, emoji);
      }

      if (processedContent.trim() === "") {
        processedContent = MARKDOWN_PLACEHOLDER;
      }

      setContent(processedContent);
      editorRef.current?.setMarkdown(processedContent);
      debouncedSave(processedContent);
    },
    [debouncedSave]
  );

  useEffect(() => {
    if (user?.id) {
      fetchWorklog();
    }
  }, [user?.id, date, fetchWorklog]);

  if (!visible) return null;

  return (
    <div className="px-4">
      <div className="text-sm flex items-center gap-2 leading-3 mb-2 text-neutral-500">
        {(saving || loading) && (
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800" />
        )}
        PRIVATE LOGS - {saving ? "Saving..." : loading ? "Loading..." : "Saved"}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            saveWorklog(content);
          }
          if (e.ctrlKey && e.key === "r") {
            e.preventDefault();
            fetchWorklog();
          }
        }}
      >
        <MdxAppEditor
          ref={editorRef}
          markdown={content}
          className="flex-grow h-full"
          placeholder="* Write your private logs here ..."
          contentEditableClassName={`mdx_ce ${
            content.trim() === MARKDOWN_PLACEHOLDER ? "mdx_uninit" : ""
          } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleContentChange}
          key={user?.id + date}
        />
      </div>
    </div>
  );
};
