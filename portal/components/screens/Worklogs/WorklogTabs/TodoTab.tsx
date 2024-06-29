import React, { useState, useEffect, useCallback } from "react";
import { DocMarkdown } from "@prisma/client";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { debounce } from "lodash";

const TodoTabs = ({ userId }: { userId: string }) => {
  const MARKDOWN_PLACHELODER = `*`;
  const [docMarkdown, setDocMarkdown] = useState<DocMarkdown | null>(null);
  const [markdownContent, setMarkdownContent] =
    useState<string>(MARKDOWN_PLACHELODER);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLaterToDo(userId);
  }, [userId]);

  const fetchLaterToDo = (userId: string) => {
    setLoading(true);
    PortalSdk.getData(`/api/user/todolater?userId=${userId}`, null)
      .then((data) => {
        setDocMarkdown(data);
        setMarkdownContent(data.data?.markdown.content || "");
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
      PortalSdk.putData(`/api/user/todolater`, {
        data: {
          userId: userId,
          logType: "todoLater",
          markdown: { content: content },
        },
      })
        .then((response) => {
          console.log("Markdown saved successfully", response);
        })
        .catch((error) => {
          console.error("Error saving markdown", error);
        });
    },
    [userId]
  );

  const debouncedSave = useCallback(
    debounce((content: string) => saveMarkdownContent(content), 3000),
    [saveMarkdownContent]
  );

  const handleMarkdownChange = (content: string) => {
    setMarkdownContent(content);
    debouncedSave(content);
  };

  return (
    <>
      {loading === false ? (
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
          }}
        >
          <MdxAppEditor
            key={`${userId}`}
            markdown={
              markdownContent.length !== 0
                ? markdownContent
                : MARKDOWN_PLACHELODER
            }
            contentEditableClassName="mdx_ce leading-1 imp-p-0 grow w-full h-full"
            onChange={handleMarkdownChange}
          />
        </div>
      ) : (
        <div className="animate-spin rounded-full h-5 w-5 p-2 mt-2 border-t-2 border-b-2 border-neutral-700"></div>
      )}
    </>
  );
};

export default TodoTabs;
