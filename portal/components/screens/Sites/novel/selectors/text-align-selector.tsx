import { Check, ChevronDown } from 'lucide-react';
import { EditorBubbleItem, useEditor } from 'novel';

import { Button } from '../../../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/popover';

export interface BubbleAlignMenuItem {
  name: string;
  align: 'left' | 'center' | 'right' | 'justify';
}

const TEXT_ALIGNMENTS: BubbleAlignMenuItem[] = [
  { name: 'Left', align: 'left' },
  { name: 'Center', align: 'center' },
  { name: 'Right', align: 'right' },
  { name: 'Justify', align: 'justify' },
];

interface AlignSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlignSelector = ({ open, onOpenChange }: AlignSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const activeAlignItem = TEXT_ALIGNMENTS.find(({ align }) =>
    editor.isActive({ textAlign: align }),
  );

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2 rounded-none" variant="ghost">
          <span className="font-medium">
            {activeAlignItem?.name || 'Align'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="my-1 flex w-48 flex-col overflow-hidden rounded border p-1 shadow-xl"
        align="start"
      >
        {TEXT_ALIGNMENTS.map(({ name, align }) => (
          <EditorBubbleItem
            key={name}
            onSelect={() => {
              editor.chain().focus().setTextAlign(align).run();
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center justify-between px-2 py-1 text-sm hover:bg-accent"
          >
            <span>{name}</span>
            {editor.isActive('textAlign', { textAlign: align }) && (
              <Check className="h-4 w-4" />
            )}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};
