import { Button } from '@/components/ui/button';
import { DialogContent } from '@/components/ui/dialog';
import { Dialog } from '@/components/ui/dialog';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Post, PostStatus, PostVariant } from '@prisma/client';
import { ArrowLeftIcon, Loader2, TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface PostPageHeaderProps {
    post: Post;
    setPost: (post: Post) => void;
    siteId: string;
    variant: PostVariant | null;
    isVariantUnsaved: boolean | null;
    isUnsaved: boolean | null;
    isSavingVariation: boolean | null;
    isSaving: boolean | null;
    handleUpdateVariant: (variant: any) => void;
    handleUpdatePost: (post: any) => void;
    editedVariant: PostVariant | null;
}

const PostPageHeader: React.FC<PostPageHeaderProps> = ({
    post,
    setPost,
    siteId,
    variant,
    isVariantUnsaved,
    isUnsaved,
    isSavingVariation,
    isSaving,
    handleUpdateVariant,
    handleUpdatePost,
    editedVariant,
}) => {
    const router = useRouter();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDeletePost = async () => {
        try {
            await PortalSdk.deleteData(`/api/sites/posts`, {
                id: post.id,
            });
            router.push(`/sites/${siteId}`);
        } catch (error) {
            console.error('Failed to delete post', error);
            toast.error('Failed to delete post!');
        }
    };


    const handlePublishToggle = async () => {
        try {
            const updatedPost = await PortalSdk.putData(`/api/sites/posts`, {
                id: post.id,
                status:
                    post?.status === PostStatus.PUBLISHED
                        ? PostStatus.DRAFT
                        : PostStatus.PUBLISHED,
            });
            setPost(updatedPost);
        } catch (error) {
            console.error('Failed to toggle publish status', error);
            toast.error('Failed to toggle publish status!');
        }
    };

    return (
        <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-col items-start justify-start">
                <Link
                    href={`/sites/${siteId}`}
                    className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700"
                >
                    <ArrowLeftIcon size={16} />
                    Back to Dashboard
                </Link>
                <p className="text-md mb-2 text-neutral-900">/{post?.slug}</p>
            </div>

            {variant ? (
                <div className="flex gap-2">
                    {isVariantUnsaved && (
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2"
                            onClick={() => handleUpdateVariant(editedVariant)}
                        >
                            {isSavingVariation && <Loader2 className="animate-spin" />}
                            {isSavingVariation ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                    <Button
                        disabled={isSavingVariation ?? false}
                        variant="link"
                        onClick={handlePublishToggle}
                        className={`flex items-center gap-2 ${post?.status === PostStatus.DRAFT ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {post?.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                        disabled={isSavingVariation ?? false}
                        variant="ghost"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <TrashIcon size={16} />
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2">
                    {isUnsaved && (
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2"
                            onClick={handleUpdatePost}
                        >
                            {isSaving && <Loader2 className="animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                    <Button
                        disabled={isSaving ?? false}
                        variant="link"
                        onClick={handlePublishToggle}
                        className={`flex items-center gap-2 ${post?.status === PostStatus.DRAFT ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {post?.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                        disabled={isSaving ?? false}
                        variant="ghost"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <TrashIcon size={16} />
                    </Button>
                </div>
            )}

            {showDeleteDialog && (
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <div className="p-4">
                            <h3 className="mb-4 text-lg font-semibold">Confirm Delete</h3>
                            <p>
                                Are you sure you want to delete this post? This action cannot
                                be undone.
                            </p>
                            <div className="mt-4 flex justify-end space-x-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDeleteDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeletePost}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default PostPageHeader; 