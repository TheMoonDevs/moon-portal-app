'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Post, PostStatus, PostVariant } from '@prisma/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Button } from '@/components/ui/button';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    DeleteIcon,
    Loader2,
    PlusIcon,
    TrashIcon,
} from 'lucide-react';
import TailwindAdvancedEditor, { defaultEditorContent } from '@/components/screens/Sites/novel/NovelEditor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { TabsContent, TabsList } from '@/components/ui/tabs';
import { TabsTrigger, Tabs } from '@/components/ui/tabs';
import Image from 'next/image';
import {
    AIMetadata,
    exampleAIMetadata,
    exampleSeoMetadata,
    SEOMetadata,
} from './types';
import dayjs from 'dayjs';
import TabSeoContent from './TabSeoContent';
import TabAiMetaContent from './TabAiMetaContent';
import { toast, Toaster } from 'sonner';
import { DialogFooter } from '@/components/elements/dialog';
import useSWR from 'swr';

const PostPage: React.FC = () => {
    const [post, setPost] = useState<Post | null>(null);
    const [editedPost, setEditedPost] = useState<Post | null>(null);

    const [variant, setVariant] = useState<PostVariant | null>(null);
    const [editedVariant, setEditedVariant] = useState<PostVariant | null>(null);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const postId = params?.post_id as string;
    const siteId = params?.site_id as string;
    const variantId = searchParams?.get('variant_id') as string;

    const [showNewVariationDialog, setShowNewVariationDialog] = useState(false);

    //useDiff between editedPost and post & give me a boolean value
    const isUnsaved = useMemo(() => {
        return (
            editedPost && post && JSON.stringify(editedPost) !== JSON.stringify(post)
        );
    }, [editedPost, post]);
    const [isSaving, setIsSaving] = useState(false);

    // sync & save every 500milliseconds if isUnsaved is true
    useEffect(() => {
        const interval = setInterval(() => {
            if (isUnsaved) {
                handleUpdatePost(editedPost);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [isUnsaved, editedPost]);

    const isVariantUnsaved = useMemo(() => {
        return (
            editedVariant &&
            variant &&
            JSON.stringify(editedVariant) !== JSON.stringify(variant)
        );
    }, [editedVariant, variant]);
    const [isSavingVariation, setIsSavingVariation] = useState(false);


    // TODO: change to useSWR
    const { data, isLoading: isPostLoading, mutate: mutatePost } = useSWR(`/api/sites/posts?id=${postId}`, (url: string) => {
        return PortalSdk.getData(url, {});
    }, {
        onSuccess(data, key, config) {
            setPost(data[0]);
            setEditedPost(data[0]);
        },
    });

    const { data: postVariants, isLoading: isPostVariantsLoading, mutate: mutatePostVariants } = useSWR(`/api/sites/posts/variants?postId=${postId}`, (url: string) => {
        return PortalSdk.getData(url, {});
    });

    const handleUpdateLocalPost = async (
        content: any,
        title: any,
        para: any,
        image: any,
        markdown: any,
    ) => {
        setEditedPost((prev) => {
            let slug = title?.split(' ').join('-').toLowerCase();
            // get the first 3 words of the title
            if (slug && slug?.split('-')?.length > 4)
                slug = slug?.split('-').slice(0, 4).join('-');
            slug = slug?.replace(/[^a-z0-9-]/g, '-');
            slug = slug?.replace(/-+/g, '-');
            slug = slug?.replace(/^-+|-+$/g, '');
            //slug = slug + '-' + dayjs().format('DDYY');
            const updatedPost = {
                ...prev!,
                jsonContent: content,
                ...(title && { slug }),
                ...(title && { title }),
                ...(para && { excerpt: para }),
                ...(image && { coverImage: image }),
                ...(markdown && { content: markdown }),
            };
            return updatedPost;
        });
        return true;
    };

    const handleUpdatePost = async (_post: any) => {
        try {
            setIsSaving(true);
            const updatedPost = await PortalSdk.putData(`/api/sites/posts`, {
                id: postId,
                ...(_post ?? editedPost),
            });
            setPost(updatedPost);
        } catch (error) {
            console.error('Failed to update post', error);
            toast.error('Failed to update post!');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateVariation = (_variation: any) => {
        toast.promise(async () => {
            try {
                setIsSavingVariation(true);
                const updatedPost = await PortalSdk.postData(`/api/sites/posts/variants`, {
                    postId: postId,
                    ...(_variation ?? editedVariant),
                });
                mutatePostVariants([...postVariants, updatedPost]);
                setVariant(updatedPost);
                setEditedVariant(updatedPost);
                router.replace(`/sites/${siteId}/posts/${postId}?variant_id=${updatedPost.variantId}`, {
                });
            } catch (error) {
                console.error('Failed to create variation', error);
                toast.error('Failed to create variation!');
            } finally {
                setIsSavingVariation(false);
            }
        }, {
            loading: 'Creating variation...',
            success: 'Variation created successfully!',
            error: 'Failed to create variation!',
        });
    };

    const handleDeletePost = async () => {
        try {
            await PortalSdk.deleteData(`/api/sites/posts`, {
                id: postId,
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
                id: postId,
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

    if (!post)
        return (<div className='flex justify-center items-center h-screen'>
            <Loader2 className='animate-spin' />
        </div>)

    return (
        <div className="min-h-screen">
            <Toaster />
            <div className="flex flex-col p-4">
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

                    {variantId && (
                        <div className="flex gap-2">
                            {isVariantUnsaved && (
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2"
                                    onClick={handleUpdatePost}
                                >
                                    {isSavingVariation && <Loader2 className="animate-spin" />}
                                    {isSavingVariation ? 'Saving...' : 'Save'}
                                </Button>
                            )}
                            <Button
                                disabled={isSavingVariation}
                                variant={post?.status === PostStatus.PUBLISHED ? 'link' : 'link'}
                                onClick={handlePublishToggle}
                                className={`flex items-center gap-2 ${post?.status === PostStatus.DRAFT ? 'text-green-500' : 'text-red-500'}`}
                            >
                                {post?.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                                disabled={isSavingVariation}
                                variant="ghost"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <TrashIcon size={16} />
                            </Button>
                        </div>
                    )}
                    {!variantId && (
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
                                disabled={isSaving}
                                variant={post?.status === PostStatus.PUBLISHED ? 'link' : 'link'}
                                onClick={handlePublishToggle}
                                className={`flex items-center gap-2 ${post?.status === PostStatus.DRAFT ? 'text-green-500' : 'text-red-500'}`}
                            >
                                {post?.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                                disabled={isSaving}
                                variant="ghost"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <TrashIcon size={16} />
                            </Button>
                        </div>)}
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <div className="flex grid h-screen w-full grid-cols-8 backdrop-blur-xl">
                        <div className="col-span-1">
                            <ul className="flex flex-col justify-end gap-2 py-8 text-right">
                                <li
                                    className={`flex cursor-pointer items-center justify-end gap-2 hover:text-neutral-700 ${variant === null ? 'text-md font-bold text-black' : 'font-regular text-sm text-neutral-500'}`}
                                    onClick={() => {
                                        if (isVariantUnsaved) toast.info('Changes not saved yet');
                                        else setVariant(null);
                                    }}
                                >
                                    Original
                                    {variant === null && <ArrowRightIcon size={16} />}
                                </li>
                                {(postVariants as PostVariant[])?.map((_variant) => (
                                    <li
                                        onClick={() => {
                                            if (isVariantUnsaved) toast.info('Changes not saved yet');
                                            else setVariant(_variant);
                                        }}
                                        key={_variant.postId}
                                        className={`flex cursor-pointer items-center justify-end gap-2 text-neutral-500 hover:text-neutral-700 ${_variant?.variantId === variant?.variantId ? 'text-md font-bold text-black' : 'font-regular text-sm text-neutral-500'}`}
                                    >
                                        {_variant?.slug}
                                        {_variant?.variantId === variant?.variantId && (
                                            <ArrowRightIcon size={16} />
                                        )}
                                    </li>
                                ))}

                                <Dialog>
                                    <DialogTrigger>
                                        {' '}
                                        <li
                                            className={`flex cursor-pointer items-center justify-end gap-2 text-sm text-neutral-500 hover:text-neutral-700`}
                                            onClick={() => {
                                                if (isVariantUnsaved)
                                                    return toast.info('Changes not saved yet');
                                                if (!post) return toast.error('Post not found');
                                                if (!post?.jsonContent) return toast.error('Original Post content not found');
                                                if (!post?.title) return toast.error('Original Post title not found');
                                                setShowNewVariationDialog(true);
                                                let _variant = {
                                                    postId: postId,
                                                    slug: '',
                                                    jsonContent: post?.jsonContent as any,
                                                    title: post?.title ?? '',
                                                    subtitle: post?.subtitle ?? '',
                                                    seoMeta: post?.seoMeta as SEOMetadata,
                                                    aiMeta: post?.aiMeta as AIMetadata,
                                                    variantId: '',
                                                    siteId: siteId,
                                                    content: post?.content ?? '',
                                                    name: '',
                                                    prompt: '',
                                                };
                                                setEditedVariant(_variant);
                                                setVariant(_variant);
                                            }}
                                        >
                                            <PlusIcon size={12} />
                                            New Variation
                                        </li>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className='text-2xl font-bold mb-4'>New Variation</DialogTitle>
                                            <DialogDescription>
                                                {editedVariant && (
                                                    <div className='flex flex-col gap-2 text-black'>
                                                        <div className='flex flex-col gap-1'>
                                                            <label htmlFor="variantName">Name</label>
                                                            <input
                                                                id="variantName"
                                                                type="text"
                                                                className='w-full rounded rounded-lg border p-2 outline-none text-md'
                                                                placeholder='Long story short'
                                                                value={editedVariant?.name ?? ''}
                                                                onChange={(e) => setEditedVariant((prev) => ({
                                                                    ...prev!,
                                                                    name: e.target.value,
                                                                    slug: e.target.value?.toLowerCase().replaceAll(' ', '-') ?? '',
                                                                }))}
                                                                autoComplete='off'
                                                            />
                                                        </div>
                                                        <div className='flex flex-col gap-1'>
                                                            <label htmlFor="variantPrompt">Prompt</label>
                                                            <input
                                                                id="variantPrompt"
                                                                type="text"
                                                                placeholder='Read this like an entreprenuer with no time to read'
                                                                className='w-full rounded rounded-lg border p-2 outline-none text-md'
                                                                value={editedVariant?.prompt ?? ''}
                                                                onChange={(e) => setEditedVariant((prev) => ({ ...prev!, prompt: e.target.value }))}
                                                                autoComplete='off'
                                                            />
                                                        </div>
                                                        <div className='flex flex-col gap-1'>
                                                            <label htmlFor="variantSlug">Slug</label>
                                                            <input
                                                                id="variantSlug"
                                                                type="text"
                                                                className='w-full rounded rounded-lg border p-2 outline-none text-md'
                                                                placeholder='long-story-short'
                                                                value={editedVariant?.slug ?? ''}
                                                                onChange={(e) => setEditedVariant((prev) => ({ ...prev!, slug: e.target.value }))}
                                                                autoComplete='off'
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </DialogDescription>
                                            <DialogFooter className='pt-4'>
                                                <Button variant="outline" onClick={() => {
                                                    //setShowNewVariationDialog(false)
                                                    toast.info('Feature in development');
                                                }}>
                                                    Add for all posts
                                                </Button>
                                                <Button variant="default" onClick={() => {
                                                    handleCreateVariation(editedVariant);
                                                    setShowNewVariationDialog(false);
                                                }}>Add For this Post</Button>
                                            </DialogFooter>
                                        </DialogHeader>
                                    </DialogContent>
                                </Dialog>
                            </ul>
                        </div>
                        <div className="col-span-5 m-4 w-[50vw] flex-1 rounded-lg border-neutral-200">
                            {!variant && (
                                <TailwindAdvancedEditor
                                    content={editedPost?.jsonContent as any ?? defaultEditorContent}
                                    onUpdate={handleUpdateLocalPost}
                                />
                            )}
                            {variant && (
                                <TailwindAdvancedEditor
                                    content={editedPost?.jsonContent as any ?? defaultEditorContent}
                                    onUpdate={async (content, title, para, image, markdown) => {
                                        setEditedVariant((prev) => {
                                            //slug = slug + '-' + dayjs().format('DDYY');
                                            return {
                                                ...prev!,
                                                jsonContent: content,
                                                ...(title && { title }),
                                                ...(para && { excerpt: para }),
                                                ...(image && { coverImage: image }),
                                                ...(markdown && { content: markdown }),
                                            };
                                        });
                                        return true;
                                    }}
                                />
                            )}
                        </div>
                        <div className="col-span-2 m-4 rounded-lg border-neutral-200">
                            {variant && (
                                <Tabs defaultValue="variant" className="w-full">
                                    <TabsList className="ml-auto">
                                        <TabsTrigger value="variant">Variant</TabsTrigger>
                                        <TabsTrigger value="seo">SEO-Meta</TabsTrigger>
                                        <TabsTrigger value="ai">AI-Meta</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="variant">
                                        <div className="mt-4 flex flex-col gap-2">
                                            <div>
                                                <label
                                                    htmlFor="title"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Title
                                                </label>
                                                <input
                                                    id="title"
                                                    type="text"
                                                    value={editedVariant?.title}
                                                    onChange={(e) =>
                                                        setEditedVariant((prev) => ({
                                                            ...prev!,
                                                            title: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Post title"
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
                                                    placeholder="Post slug"
                                                />
                                            </div>
                                            {/* <div>
                                                <label
                                                    htmlFor="image_cover"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Cover Image (put in the editor)
                                                </label>
                                                <Image
                                                    src={
                                                        editedVariant.coverImage ??
                                                        '/images/gradientBanner.jpg'
                                                    }
                                                    className="h-40 w-full rounded-lg object-cover"
                                                    alt="Cover Image"
                                                    width={100}
                                                    height={100}
                                                />
                                            </div> */}
                                            <div>
                                                <label
                                                    htmlFor="excerpt"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Prompt
                                                </label>
                                                <input
                                                    id="prompt"
                                                    type="text"
                                                    value={editedVariant?.prompt ?? ''}
                                                    onChange={(e) =>
                                                        setEditedVariant((prev) => ({
                                                            ...prev!,
                                                            prompt: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Post Variation Prompt"
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="seo">
                                        <TabSeoContent
                                            seoMeta={editedVariant?.seoMeta as SEOMetadata}
                                            setEditedPost={setEditedVariant}
                                            exampleSeoMetadata={exampleSeoMetadata}
                                        />
                                    </TabsContent>
                                    <TabsContent value="ai">
                                        <TabAiMetaContent
                                            aiMeta={editedVariant?.aiMeta as AIMetadata}
                                            setEditedPost={setEditedVariant}
                                            exampleAIMetadata={exampleAIMetadata}
                                        />
                                    </TabsContent>
                                </Tabs>
                            )}
                            {editedPost && !variant && (
                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="ml-auto">
                                        {variant && (
                                            <TabsTrigger value="variant">Variant</TabsTrigger>
                                        )}
                                        <TabsTrigger value="general">General</TabsTrigger>
                                        <TabsTrigger value="seo">SEO-Meta</TabsTrigger>
                                        <TabsTrigger value="ai">AI-Meta</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="general">
                                        <div className="mt-4 flex flex-col gap-2">
                                            <div>
                                                <label
                                                    htmlFor="title"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Title
                                                </label>
                                                <input
                                                    id="title"
                                                    type="text"
                                                    value={editedPost?.title}
                                                    onChange={(e) =>
                                                        setEditedPost((prev) => ({
                                                            ...prev!,
                                                            title: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Post title"
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
                                                    value={editedPost?.slug}
                                                    onChange={(e) =>
                                                        setEditedPost((prev) => ({
                                                            ...prev!,
                                                            slug: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Post slug"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="image_cover"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Cover Image (put in the editor)
                                                </label>
                                                <Image
                                                    src={
                                                        editedPost?.coverImage ??
                                                        '/images/gradientBanner.jpg'
                                                    }
                                                    className="h-40 w-full rounded-lg object-cover"
                                                    alt="Cover Image"
                                                    width={100}
                                                    height={100}
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="excerpt"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Excerpt
                                                </label>
                                                <input
                                                    id="excerpt"
                                                    type="text"
                                                    value={editedPost?.excerpt ?? ''}
                                                    onChange={(e) =>
                                                        setEditedPost((prev) => ({
                                                            ...prev!,
                                                            excerpt: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Post excerpt"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="tags"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Tags
                                                </label>
                                                <input
                                                    id="tags"
                                                    type="text"
                                                    value={editedPost?.tags?.join(', ') ?? ''}
                                                    onChange={(e) =>
                                                        setEditedPost((prev) => ({
                                                            ...prev!,
                                                            tags: e.target.value
                                                                .split(',')
                                                                .map((tag) => tag.trim()),
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Seperate tags with commas"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="category"
                                                    className="text-xs text-neutral-500"
                                                >
                                                    Category
                                                </label>
                                                <input
                                                    id="category"
                                                    type="text"
                                                    value={editedPost?.categories?.join(', ') ?? ''}
                                                    onChange={(e) =>
                                                        setEditedPost((prev) => ({
                                                            ...prev!,
                                                            categories: e.target.value
                                                                .split(',')
                                                                .map((tag) => tag.trim()),
                                                        }))
                                                    }
                                                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                                                    placeholder="Seperate categories with commas"
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="seo">
                                        <TabSeoContent
                                            seoMeta={editedPost?.seoMeta as SEOMetadata}
                                            setEditedPost={setEditedPost}
                                            exampleSeoMetadata={exampleSeoMetadata}
                                        />
                                    </TabsContent>
                                    <TabsContent value="ai">
                                        <TabAiMetaContent
                                            aiMeta={editedPost?.aiMeta as AIMetadata}
                                            setEditedPost={setEditedPost}
                                            exampleAIMetadata={exampleAIMetadata}
                                        />
                                    </TabsContent>
                                </Tabs>
                            )}
                        </div>
                    </div>
                </div>

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
        </div>
    );
};

export default PostPage;
