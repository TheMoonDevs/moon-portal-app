import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { SEOMetadata, AIMetadata } from './types'; // Adjust import path as needed
import { useState } from 'react';

interface NewVariationDialogProps {
    post: any; // Type this properly based on your post type
    postId: string;
    siteId: string;
    isVariantUnsaved: boolean | null;
    onCreateVariation: (variant: any) => void;
    onSubmit: () => void;
}

export function NewVariationDialog({
    post,
    postId,
    siteId,
    isVariantUnsaved,
    onCreateVariation,
    onSubmit
}: NewVariationDialogProps) {
    const [editedVariant, setEditedVariant] = useState<any>(null);
    const [showNewVariationDialog, setShowNewVariationDialog] = useState(false);

    const handleClick = () => {
        if (isVariantUnsaved) {
            toast.info('Changes not saved yet');
            return;
        }
        if (!post) return toast.error('Post not found');
        if (!post?.jsonContent) return toast.error('Original Post content not found');
        if (!post?.title) return toast.error('Original Post title not found');

        setShowNewVariationDialog(true);
        let _variant = {
            postId: postId,
            slug: '',
            jsonContent: null,
            title: post?.title ?? '',
            subtitle: post?.subtitle ?? '',
            seoMeta: post?.seoMeta as SEOMetadata,
            aiMeta: post?.aiMeta as AIMetadata,
            siteId: siteId,
            content: '',
            name: '',
            prompt: '',
        };
        setEditedVariant(_variant);
    };

    return (
        <Dialog open={showNewVariationDialog} onOpenChange={setShowNewVariationDialog}>
            <DialogTrigger>
                <li className="flex cursor-pointer items-center justify-end gap-2 text-sm text-neutral-500 hover:text-neutral-700"
                    onClick={handleClick}>
                    <PlusIcon size={12} />
                    New Variation
                </li>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold mb-4">New Variation</DialogTitle>
                    <DialogDescription>
                        {editedVariant && (
                            <div className="flex flex-col gap-2 text-black">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="variantName">Name</label>
                                    <input
                                        id="variantName"
                                        type="text"
                                        className="w-full rounded rounded-lg border p-2 outline-none text-md"
                                        placeholder="Long story short"
                                        value={editedVariant?.name ?? ''}
                                        onChange={(e) => setEditedVariant((prev: any) => ({
                                            ...prev!,
                                            name: e.target.value,
                                            slug: e.target.value?.toLowerCase().replaceAll(' ', '-') ?? '',
                                        }))}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="variantPrompt">Prompt</label>
                                    <input
                                        id="variantPrompt"
                                        type="text"
                                        placeholder="Read this like an entreprenuer with no time to read"
                                        className="w-full rounded rounded-lg border p-2 outline-none text-md"
                                        value={editedVariant?.prompt ?? ''}
                                        onChange={(e) => setEditedVariant((prev: any) => ({ ...prev!, prompt: e.target.value }))}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="variantSlug">Slug</label>
                                    <input
                                        id="variantSlug"
                                        type="text"
                                        className="w-full rounded rounded-lg border p-2 outline-none text-md"
                                        placeholder="long-story-short"
                                        value={editedVariant?.slug ?? ''}
                                        onChange={(e) => setEditedVariant((prev: any) => ({ ...prev!, slug: e.target.value }))}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}
                    </DialogDescription>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => toast.info('Feature in development')}>
                            Add for all posts
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                setShowNewVariationDialog(false);
                                onCreateVariation(editedVariant);
                                onSubmit();
                            }}
                        >
                            Add For this Post
                        </Button>
                    </DialogFooter>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}