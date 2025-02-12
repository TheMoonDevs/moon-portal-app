import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { MDXEditorMethods } from '@mdxeditor/editor';
import React, { useEffect, useRef } from 'react';
const MARKDOWN_PLACEHOLDER = '*';

interface WorklogMdxEditorProps {
  content: string;
  onChange: (content: string) => void;
  editorRef: React.RefObject<MDXEditorMethods>;
  saveWorklog: (content: string) => void;
  fetchWorklog: () => void;
}

const WorklogMdxEditor: React.FC<WorklogMdxEditorProps> = ({
  content,
  onChange,
  editorRef,
  saveWorklog,
  fetchWorklog,
}) => {
  const editorInstance = useRef<any | null>(null);

  const formatText = (formatType: 'bold' | 'italic' | 'underline') => {
    if (!editorInstance.current) return;

    const selection = editorInstance.current.state.selection;

    if (!selection.empty) {
      const selectedText = editorInstance.current.state.doc.textBetween(
        selection.from,
        selection.to,
      );
      let newText = selectedText;

      switch (formatType) {
        case 'bold':
          newText = `**${selectedText}**`;
          break;
        case 'italic':
          newText = `*${selectedText}*`;
          break;
        case 'underline':
          newText = `<u>${selectedText}</u>`;
          break;
      }

      editorInstance.current.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: newText,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveWorklog(content);
    }
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      fetchWorklog();
    }
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.insertMarkdown('✅');
      }
    }
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.insertMarkdown('❌');
      }
    }
    if (e.ctrlKey && e.key === 'b' && editorInstance.current) {
      e.preventDefault();
      formatText('bold');
    }
    if (e.ctrlKey && e.key === 'i' && editorInstance.current) {
      e.preventDefault();
      formatText('italic');
    }
    if (e.ctrlKey && e.key === 'u' && editorInstance.current) {
      e.preventDefault();
      formatText('underline');
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorInstance.current = editorRef.current;
    }
  }, [editorRef]);

  return (
    <div onKeyDown={handleKeyDown}>
      <MdxAppEditor
        ref={editorRef}
        markdown={content}
        className="h-full flex-grow"
        placeholder="* Write your private logs here ..."
        contentEditableClassName={`mdx_ce ${content.trim() === MARKDOWN_PLACEHOLDER ? 'mdx_uninit' : ''} leading-1 imp-p-0 grow w-full h-full`}
        onChange={onChange}
        editorKey={''}
      />
    </div>
  );
};

export default WorklogMdxEditor;
