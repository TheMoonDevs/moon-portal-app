"use client";

import { useUser } from "@/utils/hooks/useUser";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { DocMarkdown } from "@prisma/client";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { WorklogEditor } from "./WorklogEditor";
import dayjs from "dayjs";
import store from "@/utils/redux/store";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { debounce } from "lodash";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { decryptData, encryptData } from "@/utils/privacy/encryption";
import { hashPassphrase } from "@/utils/privacy/hashing";

export const MARKDOWN_PLACEHOLDER = `*`;

export const PrivateWorklogView = ({
  date,
  logType = "dayLog",
  compactView,
  visible = true,
  monthTab,
  setMonthTab,
  handleNextMonthClick,
}: {
  date: string;
  compactView?: boolean;
  visible?: boolean;
  logType?: string | null;
  monthTab?: number;
  setMonthTab?: Dispatch<SetStateAction<number>>;
  handleNextMonthClick?: () => void;
}) => {
  const { user } = useUser();

  const [privateWorklogs, setPrivateWorklogs] = useState<DocMarkdown | null>(
    null
  );
  const [privateWorklogsMdx, setPrivateWorklogsMdx] =
    useState<string>(MARKDOWN_PLACEHOLDER);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const mdRef = useRef<MDXEditorMethods | null>(null);

  // Debounced save function
  const saveMarkdownContent = useCallback(
    (content: string) => {
      if (!user?.id) return;
      setSaving(true);
      const secretKey = hashPassphrase("karthik").hash;
      console.log("Saving content:", content);
      console.log("Secret key:", secretKey);
      const encryptedContent = encryptData(content, secretKey);
      console.log("Encrypted content:", encryptedContent);

      PortalSdk.putData(`/api/user/worklogs/private`, {
        userId: user?.id,
        logType: "privateWorklogs",
        markdown: {
          content: encryptedContent,
        },
        date,
      })
        .then(() => {
          console.log("Markdown saved successfully");
          // Verify decryption
          const decryptedContent = decryptData(encryptedContent, secretKey);
          console.log("Decrypted content:", decryptedContent);
          console.log("Decryption successful:", content === decryptedContent);
        })
        .catch((error) => {
          console.error("Error saving markdown", error);
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [user?.id, date]
  );

  const debouncedSave = useCallback(debounce(saveMarkdownContent, 1000), [
    saveMarkdownContent,
  ]);

  const refreshWorklogs = useCallback(() => {
    if (!user?.id || !date) return;
    setLoading(true);
    let query = `?logType=${logType}&userId=${user?.id}&date=${date}`;
    PortalSdk.getData(`/api/user/worklogs/private${query}`, null)
      .then((data) => {
        const worklog = data?.data;
        const decryptedContent = decryptData(
          worklog?.markdown?.content,
          hashPassphrase("karthik").hash
        );
        console.log("Fetched encrypted content:", worklog?.markdown?.content);
        console.log("Decrypted content:", decryptedContent);
        setPrivateWorklogs({
          ...worklog,
          markdown: {
            content: decryptData(
              worklog?.markdown?.content,
              hashPassphrase("karthik").hash
            ),
          },
        });
        setPrivateWorklogsMdx(
          decryptData(
            worklog?.markdown?.content,
            hashPassphrase("karthik").hash
          ) || MARKDOWN_PLACEHOLDER
        );
        mdRef?.current?.setMarkdown(
          decryptData(
            worklog?.markdown?.content,
            hashPassphrase("karthik").hash
          )
        );
      })
      .catch((err) => {
        console.error(err);
        setPrivateWorklogsMdx(MARKDOWN_PLACEHOLDER);
        mdRef?.current?.setMarkdown(MARKDOWN_PLACEHOLDER);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [logType, user?.id, date]);

  const handleMarkdownChange = useCallback(
    (content: string) => {
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

      let newContent = content;
      for (const text in emojiMap) {
        newContent = newContent.replaceAll(text, emojiMap[text]);
      }

      if (newContent.trim() === "") {
        newContent = MARKDOWN_PLACEHOLDER;
      }

      mdRef.current?.setMarkdown(newContent);
      setPrivateWorklogsMdx(newContent);
      debouncedSave(newContent);
    },
    [debouncedSave]
  );

  useEffect(() => {
    if (!user?.id) return;
    refreshWorklogs();
  }, [user?.id, logType, date, refreshWorklogs]);

  if (!visible) return null;

  return (
    <div className="px-4">
      <div className="text-sm flex items-center gap-2 leading-3 mb-2 text-neutral-500">
        {(saving || loading) && (
          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800"></div>
        )}
        {/* {date ? dayjs(date).format("DD-MM-YYYY") : "My logs"} */}
        PRIVATE LOGS
        {" - "}
        {saving ? "Saving..." : loading ? "Fetching..." : "Saved"}
      </div>
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            console.log("Saving Worklogs");
            saveMarkdownContent(privateWorklogsMdx);
          }
          if (e.ctrlKey && e.key === "r") {
            e.preventDefault();
            console.log("Refreshing Worklogs");
            refreshWorklogs();
          }
        }}
      >
        <MdxAppEditor
          ref={mdRef}
          key={`${user?.id}`}
          markdown={privateWorklogsMdx}
          className="flex-grow h-full"
          placeholder="* Write your private logs here ..."
          contentEditableClassName={`mdx_ce ${
            privateWorklogsMdx?.trim() === MARKDOWN_PLACEHOLDER.trim()
              ? "mdx_uninit"
              : ""
          } leading-1 imp-p-0 grow w-full h-full`}
          onChange={handleMarkdownChange}
        />
      </div>
    </div>
  );
};
