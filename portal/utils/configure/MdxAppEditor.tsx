"use client";

import dynamic from "next/dynamic";
import { forwardRef, memo } from "react";
import { type MDXEditorMethods, type MDXEditorProps } from "@mdxeditor/editor";
// ForwardRefEditor.tsx

// This is the only place InitializedMDXEditor is imported directly.
const Editor = dynamic(() => import("./InitializedMDXEditor"), {
  // Make sure we turn SSR off
  ssr: false,
});

interface ExtraProps {
  editorKey: string;
}
// This is what is imported by other components. Pre-initialized with plugins, and ready
// to accept other props, including a ref.
export const MdxAppEditor = memo(
  forwardRef<MDXEditorMethods, ExtraProps & MDXEditorProps>((props, ref) => (
    <Editor {...props} editorRef={ref} />
  )),
  (prev, next) => {
    // console.log("prev", prev.editorKey);
    // console.log("next", next.editorKey);
    return "editorKey" in prev && "editorKey" in next && prev.editorKey === next.editorKey;
  }
);
// TS complains without the following line
MdxAppEditor.displayName = "MdxAppEditor";
