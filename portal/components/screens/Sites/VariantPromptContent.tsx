import React from 'react';
import { Button } from '@/components/ui/button';
import { CircleArrowLeftIcon } from 'lucide-react';
import { PostVariant } from '@prisma/client';

interface VariantPromptContentProps {
    editedVariant: PostVariant | null;
    setEditedVariant: React.Dispatch<React.SetStateAction<PostVariant | null>>;
    onSubmit: () => void;
}

const VariantPromptContent: React.FC<VariantPromptContentProps> = ({
    editedVariant,
    setEditedVariant,
    onSubmit
}) => {
    return (
        <div className="mt-4 flex flex-col gap-2">
            <div>
                <label
                    htmlFor="title"
                    className="text-xs text-neutral-500"
                >
                    Name
                </label>
                <input
                    id="title"
                    type="text"
                    value={editedVariant?.name ?? ''}
                    onChange={(e) =>
                        setEditedVariant((prev) => ({
                            ...prev!,
                            name: e.target.value,
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Variant name"
                />
            </div>
            <div>
                <label
                    htmlFor="slug"
                    className="text-xs text-neutral-500"
                >
                    Slug
                </label>
                <input
                    id="slug"
                    type="text"
                    value={editedVariant?.slug}
                    onChange={(e) =>
                        setEditedVariant((prev) => ({
                            ...prev!,
                            slug: e.target.value,
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Variant slug"
                />
            </div>
            <div>
                <label
                    htmlFor="excerpt"
                    className="text-xs text-neutral-500"
                >
                    Prompt
                </label>
                <textarea
                    id="prompt"
                    value={editedVariant?.prompt ?? ''}
                    onChange={(e) =>
                        setEditedVariant((prev) => ({
                            ...prev!,
                            prompt: e.target.value,
                        }))
                    }
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onSubmit();
                        }
                    }}
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Post Variation Prompt"
                    rows={4}
                    autoComplete='off'
                />
            </div>
            <Button
                onClick={onSubmit}
                variant='link'
                className='flex justify-start items-center mr-auto gap-2 px-1 text-black bg-white hover:text-purple-500 text-sm font-bold text-left'
            >
                <CircleArrowLeftIcon size={48} />
                Re-Generate {editedVariant?.name} Variation
            </Button>
        </div>
    );
};

export default VariantPromptContent; 