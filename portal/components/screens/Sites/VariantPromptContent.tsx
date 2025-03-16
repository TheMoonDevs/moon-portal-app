import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CircleArrowLeftIcon, RefreshCcw, Loader2 } from 'lucide-react';
import { Post, PostVariant } from '@prisma/client';
import { toast } from 'sonner';
import { PortalSdk } from '@/utils/services/PortalSdk';

interface VariantPromptContentProps {
    originPost: Post | null;
    editedVariant: PostVariant | null;
    setEditedVariant: React.Dispatch<React.SetStateAction<PostVariant | null>>;
    onSubmit: () => void;
}

const VariantPromptContent: React.FC<VariantPromptContentProps> = ({
    originPost,
    editedVariant,
    setEditedVariant,
    onSubmit,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const generateSummaryAndTitle = () => {
        setIsLoading(true);
        toast.promise(async () => {
            const response = await PortalSdk.postData('/api/sites/generate/simple', {
                content: originPost?.content,
                type: 'summary',
                variationPrompt: editedVariant?.prompt
            });
            const response2 = await PortalSdk.postData('/api/sites/generate/simple', {
                content: originPost?.content,
                type: 'title',
                variationPrompt: editedVariant?.prompt
            })
            setEditedVariant((prev) => ({
                ...prev!,
                summary: response.text,
                title: response2.text
            }));
            setIsLoading(false);
        }, {
            loading: 'Generating variation  ...',
            success: 'Variation generated successfully',
            error: 'Failed to generate variation'
        });
    }
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
                    disabled={true}
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
            <div className='relative'>
                <label
                    htmlFor="excerpt"
                    className="text-xs text-neutral-500"
                >
                    Title
                </label>
                <textarea
                    id="title"
                    value={editedVariant?.title ?? ''}
                    onChange={(e) =>
                        setEditedVariant((prev) => ({
                            ...prev!,
                            title: e.target.value ?? '',
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Post Variation Title"
                    rows={2}
                    autoComplete='off'
                />
                <Button
                    onClick={generateSummaryAndTitle}
                    variant='link'
                    className='absolute right-2 bottom-2 p-0 m-0 text-black bg-white hover:text-purple-500 text-sm font-bold text-left'
                >
                    {isLoading ? <Loader2 size={48} /> : <RefreshCcw size={48} />}
                </Button>
            </div>
            <div className='relative'>
                <label
                    htmlFor="excerpt"
                    className="text-xs text-neutral-500"
                >
                    Summary
                </label>
                <textarea
                    id="summary"
                    value={editedVariant?.summary ?? ''}
                    onChange={(e) =>
                        setEditedVariant((prev) => ({
                            ...prev!,
                            summary: e.target.value ?? '',
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Post Variation Summary"
                    rows={4}
                    autoComplete='off'
                />
                <Button
                    onClick={generateSummaryAndTitle}
                    variant='link'
                    className='absolute right-2 m-1 p-0 bottom-2 text-black bg-white hover:text-purple-500 text-sm font-bold text-left'
                >
                    {isLoading ? <Loader2 size={48} /> : <RefreshCcw size={48} />}
                </Button>
            </div>
            {/* <Button
                onClick={generateSummary}
                variant='link'
                className='flex justify-start items-center mr-auto gap-2 px-1 text-black bg-white hover:text-purple-500 text-sm font-bold text-left'
            >
                <CircleArrowLeftIcon size={48} />
                Re-Generate {editedVariant?.name} Summary
            </Button> */}
        </div>
    );
};

export default VariantPromptContent; 