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
import { memo, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Separator } from '../../../ui/separator';
import { defaultExtensions } from './extensions';
import { ColorSelector } from './selectors/color-selector';
import { LinkSelector } from './selectors/link-selector';
import { MathSelector } from './selectors/math-selector';
import { NodeSelector } from './selectors/node-selector';

import showdown from 'showdown';
import GenerativeMenuSwitch from './generative/generative-menu-switch';
import { GenerativeStreamer } from './generative/streamer';
import { useNovelImageUpload } from './image-upload';
import { AlignSelector } from './selectors/text-align-selector';
import { TextButtons } from './selectors/text-buttons';
import { slashCommand, suggestionItems } from './slash-command';
import { Button } from '@/components/ui/button';
import { generateHTML } from '@tiptap/html';

const hljs = require('highlight.js');

const extensions = [...defaultExtensions, slashCommand];

const showdownService = new showdown.Converter({
  parseImgDimensions: true,
  tasklists: true,
  simpleLineBreaks: true,
  openLinksInNewWindow: true,
  emoji: true,
});

showdownService.setFlavor('github');

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

export const defaultVariantContent = {
  type: 'doc',
  content: [
    { type: 'text', text: 'Press Space to start generating variations' },
  ],
};

const TailwindAdvancedEditor = memo(({
  isStreaming,
  streamingContent,
  content: initContent,
  onUpdate,
  onSpaceKeyPress,
  disabled = false
}: {
  isStreaming: boolean,
  streamingContent: string,
  content?: JSONContent,
  onUpdate?: (content: JSONContent, title?: string, para?: string, image?: string, markdown?: string) => Promise<boolean>,
  onSpaceKeyPress?: () => void,
  disabled?: boolean
}) => {
  const editorRef = useRef<EditorInstance>(null);
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
      const findNode = (tree: JSONContent, type: string, attrs?: number) => {
        if (tree.type === type && (!attrs || tree.attrs?.level === attrs)) {
          return tree;
        }
        let result: any = null;
        if (tree.content && tree.content?.length > 0) {
          for (const node of tree.content) {
            result = findNode(node, type, attrs);
            if (result) break;
          }
        }
        return result;
      }
      const json = editor.getJSON();
      const titleNode = findNode(json, 'heading', 1)
      const title = titleNode?.content?.[0]?.text || '';
      const paraNode = findNode(json, 'paragraph')
      const para = paraNode?.content?.[0]?.text || '';
      const imageNode = findNode(json, 'image')
      const image = imageNode?.attrs?.src || '';
      console.log('title', title);
      console.log('para', para);
      console.log('image', image);
      console.log('json', json);
      //console.log(json);
      setCharsCount(editor.storage.characterCount.words());
      window.localStorage.setItem(
        'html-content',
        highlightCodeblocks(editor.getHTML()),
      );
      //window.localStorage.setItem('novel-content', JSON.stringify(json));
      const markdown = showdownService.makeMarkdown(generateHTML(json, defaultExtensions));
      //console.log('markdown', markdown);
      onUpdate?.(json, title, para, image, markdown);

      //window.localStorage.setItem('markdown', markdown);
      setSaveStatus('Saved');
    },
    0,
  );

  //TODO: change & set initCOntent whenever the contentId changes
  useEffect(() => {
    //console.log('initContent', initContent);
    if (initContent) setInitialContent(initContent);
    else setInitialContent(null);
  }, [initContent]);

  //console.log('initialContent', initialContent);
  //console.log('isStreaming', isStreaming);

  if (!initialContent && !isStreaming) return null;

  return (
    <div className="relative flex w-full flex-col items-center justify-center bg-white">
      <EditorRoot>
        <EditorContent
          ref={editorRef as any}
          initialContent={initialContent ?? { type: 'doc', content: [] }}
          extensions={extensions}
          enableCoreExtensions
          className="relative w-full bg-background px-6 pb-6 min-h-[80vh] sm:rounded-lg  "
          editorProps={{
            //editable: () => initialContent != null,
            handleDOMEvents: {
              keydown: (_view, event) => {
                if (event.key === ' ' && onSpaceKeyPress) {
                  console.log('space', _view.state.toJSON());
                  onSpaceKeyPress();
                }
                handleCommandNavigation(event);
              },
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
            //if (!isStreaming) {
            debouncedUpdates(editor);
            setSaveStatus('Unsaved');
            if (initialContent == null && streamingContent != null) {
              setInitialContent(editor.getJSON());
            }
            //}
          }}
          slotBefore={(
            <>
              <GenerativeStreamer
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                initialContent={initialContent}
                disabled={disabled}
              />
            </>
          )}
          immediatelyRender={false}
          slotAfter={(
            <>
              <ImageResizer />
            </>
          )}
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
  return prevProps.content === nextProps.content && prevProps.isStreaming === nextProps.isStreaming
    && prevProps.streamingContent === nextProps.streamingContent && prevProps.disabled === nextProps.disabled;
});

export default TailwindAdvancedEditor;
