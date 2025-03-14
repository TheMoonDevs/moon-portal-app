'use client';
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from 'novel';
import { memo, use, useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { defaultExtensions } from './extensions';
import { ColorSelector } from './selectors/color-selector';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { NodeSelector } from './selectors/node-selector';
import { Separator } from '../../../ui/separator';

import GenerativeMenuSwitch from './generative/generative-menu-switch';
import { TextButtons } from './selectors/text-buttons';
import { slashCommand, suggestionItems } from './slash-command';
import TurndownService from 'turndown';
import { useNovelImageUpload } from './image-upload';
import { AlignSelector } from './selectors/text-align-selector';

const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];
const turndownService = new TurndownService();

export const defaultEditorContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: {
        level: 1,
      },
      content: [
        { type: 'text', text: 'New Blog Title' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'New Blog Content' },
      ],
    },
  ],
};

const TailwindAdvancedEditor = memo(({
  content: initContent,
  onUpdate
}: {
  content?: JSONContent,
  onUpdate?: (content: JSONContent, title?: string, para?: string, image?: string, markdown?: string) => Promise<boolean>
}) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(
    initContent ?? null,
  );
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [charsCount, setCharsCount] = useState();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [openAlign, setOpenAlign] = useState(false);

  const { uploadFn } = useNovelImageUpload();

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      const json = editor.getJSON();
      const titleNode = json.content?.find((node: any) => node.type === 'heading' && node.attrs?.level === 1)
      const title = titleNode?.content?.[0]?.text || '';
      const paraNode = json.content?.find((node: any) => node.type === 'paragraph')
      const para = paraNode?.content?.[0]?.text || '';
      const imageNode = json.content?.find((node: any) => node.type === 'image')
      const image = imageNode?.attrs?.src || '';
      console.log(title, para, image);
      setCharsCount(editor.storage.characterCount.words());
      window.localStorage.setItem(
        'html-content',
        highlightCodeblocks(editor.getHTML()),
      );
      //window.localStorage.setItem('novel-content', JSON.stringify(json));
      const markdown = turndownService.turndown(editor.getHTML());
      onUpdate?.(json, title, para, image, markdown);

      //window.localStorage.setItem('markdown', markdown);
      setSaveStatus('Saved');
    },
    500,
  );

  useEffect(() => {
    if (initContent) setInitialContent(initContent);
    else setInitialContent(null);
  }, [initContent]);

  if (!initialContent) return null;

  return (
    <div className="relative flex w-full flex-col items-center justify-center bg-white">
      <div className="w-full my-3 px-6 flex justify-between items-center gap-2 border-b border-neutral-200 pb-3">
        <div className='flex gap-2 items-center'>
          <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">
            Local Changes:{saveStatus}
          </div>
          <div
            className={' px-2 py-1 text-xs text-muted-foreground'
            }
          >
            {charsCount} Words
          </div>
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative w-full bg-background px-6 pb-6 min-h-[80vh] sm:rounded-lg  "
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) =>
              handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                'novel-editor-content prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full ',
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus('Unsaved');
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems(uploadFn).map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command!(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />

            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <AlignSelector open={openAlign} onOpenChange={setOpenAlign} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content;
});

export default TailwindAdvancedEditor;
