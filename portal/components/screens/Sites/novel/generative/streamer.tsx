'use client'

import { generateJSON } from "@tiptap/html";
import { useEditor } from "novel";
import { useEffect } from "react";
import showdown from "showdown";
import { defaultExtensions, plainExtensions } from "../extensions";

showdown.extension('myext', function () {
    return [{
        type: 'listener',
        listeners: {
            'hashHTMLBlocks.after': function (event, text, converter, options, globals) {
                text = text.replaceAll(/<p><img[^>]*>/g, function (wm) {
                    return '\n\n¨K' + ((globals?.gHtmlBlocks as any)?.push(wm) - 1) + 'K\n\n';
                });
                return text;
            }
        }
    }];
});

const showdownService = new showdown.Converter({
    extensions: ['myext']
});

//showdownService.setFlavor('github');
showdownService.useExtension('myext');

interface GenerativeStreamerProps {
    isStreaming: boolean;
    streamingContent: string;
    initialContent?: any;
    disabled?: boolean;
}


export const GenerativeStreamer = ({
    isStreaming,
    streamingContent,
    initialContent,
    disabled = false
}: GenerativeStreamerProps) => {
    const { editor } = useEditor();

    // TODO: This is a hack to make the editor non-editable when the streaming content is not available.
    // Fix it by manipulating editor.editable even before the streaming starts
    useEffect(() => {
        if (isStreaming) {
            editor?.setEditable(false)
            //console.log('streamingContent', showdownService.makeHtml(streamingContent));
            //console.log('streamingJSON', generateJSON(showdownService.makeHtml(streamingContent), [
            //    ...defaultExtensions
            //]));
            editor?.commands.setContent(
                generateJSON(showdownService.makeHtml(streamingContent), [
                    ...defaultExtensions
                ])
                , false);
        }
        else {
            editor?.setEditable(true, false)
        }
    }, [isStreaming, streamingContent]);

    useEffect(() => {
        if (initialContent && !editor?.isFocused && !isStreaming) {
            editor?.commands.setContent(initialContent)
        }
    }, [initialContent, isStreaming])

    // useEffect(() => {
    //     editor?.setEditable(!disabled, false)
    // }, [disabled])

    return <>

    </>
}