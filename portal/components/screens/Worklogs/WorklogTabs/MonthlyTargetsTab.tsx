import React, { useCallback, useEffect, useRef, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { MdxAppEditor } from "@/utils/configure/MdxAppEditor";
import { debounce } from "lodash";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
    setCompletedTargets,
    setIncompleteTargets,
    setTargetsMarkdown,
} from "@/utils/redux/worklogs/monthlyTargets.slice";

export const MARKDOWN_PLACEHOLDER = `*`;

interface MonthlyTargetsTabProps {
    userId: string;
    month: number;
    year: number;
}

const MonthlyTargetsTab: React.FC<MonthlyTargetsTabProps> = ({ userId, month, year }) => {
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    // moved the monthly targets logic to the parent component to render pulsating dot
    const { targetsMarkdown, incompleteTargets, completedTargets } = useAppSelector(
        (state) => state.monthlyTargets
    );
    const mdRef = useRef<MDXEditorMethods | null>(null);

    const fetchMonthlyTargets = (userId: string, month: number, year: number) => {
        setLoading(true);
        PortalSdk.getData(`/api/user/monthlytargets?userId=${userId}&month=${month}&year=${year}`, null)
            .then((data) => {
                const content = data?.data?.markdown?.content || "";
                dispatch(setTargetsMarkdown(content));
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
            PortalSdk.putData(`/api/user/monthlytargets`, {
                userId: userId,
                logType: "monthlyTargets",
                markdown: { content: content },
                month: month,
                year: year,
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
        [userId, month, year]
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
        dispatch(setTargetsMarkdown(content));
        debouncedSave(new_content);
    };

    useEffect(() => {
        if (userId) {
            fetchMonthlyTargets(userId, month, year);
        }
    }, [userId, month, year]);

    useEffect(() => {
        if (targetsMarkdown) {
            if (targetsMarkdown.trim() === "*" || targetsMarkdown.trim() === "") {
                dispatch(setIncompleteTargets(0));
            } else {
                const total = (targetsMarkdown.match(/\n/g) || []).length + 1;
                const completed = (targetsMarkdown.match(/✅/g) || []).length;
                dispatch(setIncompleteTargets(total - completed));
                dispatch(setCompletedTargets(completed));
            }
        }
    }, [targetsMarkdown]);

    return (
        <div className="mt-4">
            <div className="text-sm flex item-center gap-2 leading-3 mb-2 text-neutral-500">
                {(saving || loading) && (
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-neutral-800"></div>
                )}
                Targets - {`${completedTargets} / ${completedTargets + incompleteTargets}`}
                {" | "}
                {saving ? "saving..." : loading ? "fetching.." : "Saved"}
            </div>
            <div
                onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "s") {
                        e.preventDefault();
                        console.log("Saving Monthly Targets");
                        saveMarkdownContent(targetsMarkdown);
                    }
                    if (e.ctrlKey && e.key === "r") {
                        e.preventDefault();
                        console.log("Refreshing Monthly Targets");
                        fetchMonthlyTargets(userId, month, year);
                    }
                    if (e.ctrlKey && e.key === " ") {
                        e.preventDefault();
                        mdRef?.current?.insertMarkdown("✅");
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
                    className="flex-grow h-full"
                    contentEditableClassName={`mdx_ce ${targetsMarkdown.trim() == MARKDOWN_PLACEHOLDER.trim()
                        ? " mdx_uninit "
                        : ""
                        } leading-1 imp-p-0 grow w-full h-full`}
                    onChange={handleMarkdownChange}
                />
            </div>
        </div>
    );
};

export default MonthlyTargetsTab;

