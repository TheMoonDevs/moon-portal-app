'use client';

import { DialogFooter } from '@/components/elements/dialog';
import TailwindAdvancedEditor, { defaultEditorContent, defaultVariantContent } from '@/components/screens/Sites/novel/NovelEditor';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Post, PostStatus, PostVariant } from '@prisma/client';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CircleArrowLeftIcon,
    Loader2,
    PlusIcon,
    RefreshCcw,
    TrashIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';
import useSWR from 'swr';
import TabAiMetaContent from './TabAiMetaContent';
import TabSeoContent from './TabSeoContent';
import {
    AIMetadata,
    SEOMetadata
} from './types';
import { useChat, useCompletion } from '@ai-sdk/react';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import showdown from 'showdown';
import { generateJSON } from '@tiptap/html';
import { defaultExtensions } from './novel/extensions';
import { NewVariationDialog } from './NewVariationDialog';
import TabPostGeneralContent from './TabPostGeneralContent';
import VariantPromptContent from './VariantPromptContent';
import PostPageHeader from './PostPageHeader';
import { useDebouncedEffect } from '@/utils/hooks/useDebouncedHook';
import { prettyPrintDateAndTime } from '@/utils/helpers/prettyprint';
import dayjs from 'dayjs';

const showdownService = new showdown.Converter();

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
    //const variantId = searchParams?.get('variant_id') as string;

    const [showNewVariationDialog, setShowNewVariationDialog] = useState(false);

    //useDiff between editedPost and post & give me a boolean value
    const isUnsaved = useMemo(() => {
        return (
            editedPost && post && JSON.stringify(editedPost) !== JSON.stringify(post)
        );
    }, [editedPost, post]);
    const [isSaving, setIsSaving] = useState(false);

    // sync & save every 500milliseconds if isUnsaved is true
    useDebouncedEffect(
        () => {
            if (isSaving) return;
            if (
                JSON.stringify(post) === JSON.stringify(editedPost) ||
                !post ||
                !editedPost
            ) {
                return;
            }
            // console.log("saving... ", workLog);
            handleUpdatePost(editedPost);
        },
        [editedPost, post],
        3000,
    );

    const isVariantUnsaved = useMemo(() => {
        return (
            editedVariant &&
            variant &&
            JSON.stringify(editedVariant) !== JSON.stringify(variant)
        );
    }, [editedVariant, variant]);
    const [isSavingVariation, setIsSavingVariation] = useState(false);


    useDebouncedEffect(
        () => {
            if (isSavingVariation) return;
            if (
                JSON.stringify(variant) === JSON.stringify(editedVariant) ||
                !variant ||
                !editedVariant
            ) {
                return;
            }
            // console.log("saving... ", workLog);
            handleUpdateVariant(editedVariant);
        },
        [editedVariant, variant],
        3000,
    );


    // TODO: change to useSWR
    const { data: postData, isLoading: isPostLoading, mutate: mutatePost } = useSWR(`/api/sites/posts?id=${postId}`, (url: string) => {
        return PortalSdk.getData(url, {});
    });

    useEffect(() => {
        if (postData) {
            setPost(postData[0]);
            setEditedPost(postData[0]);
        }
    }, [postData]);

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
        //toast.promise(async () => {
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
        // },
        //     {
        //         loading: 'Saving...',
        //         success: 'Saved!',
        //         error: 'Failed to save!',
        //     });
    };

    const handleUpdateVariant = async (_variant: any) => {
        //toast.promise(async () => {
        try {
            setIsSavingVariation(true);
            //console.log(_variant, editedVariant);
            let variantToUpdate = _variant ?? editedVariant;
            let { originPost, postId, excerpt, ...updates } = variantToUpdate;
            const updatedVariant = await PortalSdk.putData(`/api/sites/posts/variants`, {
                id: variant?.variantId,
                ...updates,
            });
            setIsSavingVariation(false);
            setVariant(updatedVariant);
            setEditedVariant(updatedVariant);
            mutatePostVariants();
        } catch (error) {
            console.error('Failed to update variant', error);
            toast.error('Failed to update variant!');
        } finally {
            setIsSavingVariation(false);
        }
        // }, {
        //     loading: 'Saving...',
        //     success: 'Saved!',
        //     error: 'Failed to save!',
        // });
    };

    const handleCreateVariation = (_variation: any) => {
        toast.promise(async () => {
            try {
                setIsSavingVariation(true);
                const updatedVariant = await PortalSdk.postData(`/api/sites/posts/variants`, {
                    postId: postId,
                    ...(_variation ?? editedVariant),
                });
                mutatePostVariants([...postVariants, updatedVariant]);
                setVariant(updatedVariant);
                setEditedVariant(updatedVariant);
                router.replace(`/sites/${siteId}/post/${postId}?variant_id=${updatedVariant.variantId}`, {
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



    const { messages, input, handleInputChange, append, status, setMessages } = useChat({
        api: '/api/sites/generate/stream',
    });
    const handleSubmit = () => {
        setMessages([]);
        //console.log(editedPost?.content, editedVariant?.prompt, (editedVariant?.aiMeta as AIMetadata)?.targetAudience);
        append({
            role: 'user',
            content: editedPost?.content ?? "",
        }, {
            headers: {
                tmd_portal_api_key: TMD_PORTAL_API_KEY,
            },
            body: {
                markdown: editedPost?.content ?? '',
                variancePrompt: editedVariant?.prompt ?? '',
                varianceTags: (editedVariant?.aiMeta as AIMetadata)?.targetAudience ?? '',
            },
        });
    }
    const streamingMarkdown = useMemo(() => {
        if (messages.length > 0) {
            console.log(messages[1]?.content);
            return messages[1]?.content;
        }
        return '';
    }, [messages, editedVariant]);

    if (!post)
        return (<div className='flex justify-center items-center h-screen'>
            <Loader2 className='animate-spin' />
        </div>)

    return (
        <div className="min-h-screen">
            <Toaster />
            <div className="flex flex-col p-4">

                <PostPageHeader
                    post={post}
                    setPost={setPost}
                    siteId={siteId}
                    variant={variant}
                    isVariantUnsaved={isVariantUnsaved}
                    isUnsaved={isUnsaved}
                    isSavingVariation={isSavingVariation}
                    isSaving={isSaving}
                    handleUpdateVariant={handleUpdateVariant}
                    handleUpdatePost={handleUpdatePost}
                    editedVariant={editedVariant}
                />
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <div className="flex grid h-screen w-full grid-cols-8 backdrop-blur-xl">
                        <div className="col-span-1">
                            <ul className="flex flex-col justify-end gap-2 py-8 text-right">
                                <li
                                    className={`flex cursor-pointer items-center justify-end gap-2 hover:text-neutral-700 ${variant === null ? 'text-md font-bold text-black' : 'font-regular text-sm text-neutral-500'}`}
                                    onClick={() => {
                                        if (isVariantUnsaved) toast.info('Changes not saved yet');
                                        else if (isSavingVariation) toast.info('Saving Variations...');
                                        else setVariant(null);
                                    }}
                                >
                                    Original
                                    {variant === null && <ArrowRightIcon size={16} />}
                                </li>
                                {(postVariants as PostVariant[])?.map((_variant) => (
                                    <li
                                        onClick={() => {
                                            if (isSaving) toast.info('Saving...');
                                            else if (isSavingVariation) toast.info('Saving Variations...');
                                            else if (isVariantUnsaved) toast.info('Changes not saved yet');
                                            else {
                                                setVariant(_variant);
                                                setEditedVariant(_variant);
                                            }
                                        }}
                                        key={_variant.variantId + _variant.slug}
                                        className={`flex cursor-pointer items-center justify-end gap-2 text-neutral-500 hover:text-neutral-700 ${_variant?.variantId === variant?.variantId ? 'text-md font-bold text-black' : 'font-regular text-sm text-neutral-500'}`}
                                    >
                                        {_variant?.slug}
                                        {_variant?.variantId === variant?.variantId && (
                                            <ArrowRightIcon size={16} />
                                        )}
                                    </li>
                                ))}
                                <NewVariationDialog
                                    post={post}
                                    postId={postId}
                                    siteId={siteId}
                                    isSaving={isSaving}
                                    isUnsaved={isUnsaved}
                                    isVariantUnsaved={isVariantUnsaved}
                                    isSavingVariation={isSavingVariation}
                                    onCreateVariation={handleCreateVariation}
                                    onSubmit={handleSubmit}
                                />
                            </ul>
                        </div>
                        <div className="col-span-5 m-4 w-[50vw] flex-1 rounded-lg border-neutral-200">
                            <div className="w-full my-3 px-6 flex justify-between items-center gap-2 border-b border-neutral-200 pb-3">
                                {variant ?
                                    (<div className='text-xs text-muted-foreground'>
                                        {status === 'streaming' ? 'Generating...' :
                                            <Button
                                                onClick={handleSubmit}
                                                variant='link'
                                                className='flex justify-start items-center mr-auto gap-2 px-1 text-black bg-white hover:text-purple-500 text-sm font-bold text-left'
                                            >
                                                <RefreshCcw size={48} />
                                                Re-Generate {editedVariant?.name} Variation
                                            </Button>
                                        }
                                    </div>) : (
                                        <div className='text-xs text-muted-foreground'>
                                            Last Updated: {dayjs(post?.updatedAt)?.format(`DD-MM-YYYY HH:mm`)}
                                        </div>
                                    )}
                                <div className='flex gap-2 items-center'>
                                    <div
                                        className={' px-2 py-1 text-xs text-muted-foreground'
                                        }
                                    >
                                        {variant ? variant.content?.length : editedPost?.content?.length ?? "0"} Words
                                    </div>
                                </div>
                            </div>
                            {!variant && (
                                <TailwindAdvancedEditor
                                    disabled={isSaving}
                                    content={editedPost?.jsonContent as any ?? defaultEditorContent}
                                    onUpdate={handleUpdateLocalPost}
                                    isStreaming={false}
                                    streamingContent={''}
                                />
                            )}
                            {variant && (
                                <div className='w-full h-full relative'>
                                    <TailwindAdvancedEditor
                                        disabled={isSavingVariation}
                                        content={editedVariant?.jsonContent as any}
                                        isStreaming={status === 'streaming'}
                                        streamingContent={streamingMarkdown}
                                        onUpdate={async (content, title, para, image, markdown) => {
                                            setEditedVariant((prev) => {
                                                //slug = slug + '-' + dayjs().format('DDYY');
                                                return {
                                                    ...prev!,
                                                    jsonContent: content ?? defaultVariantContent,
                                                    ...(title && { title }),
                                                    ...(para && { subtitle: para }),
                                                    ...(image && { coverImage: image }),
                                                    ...(markdown && { content: markdown }),
                                                };
                                            });
                                            return true;
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="col-span-2 m-4 rounded-lg border-neutral-200">
                            {variant && (
                                <Tabs defaultValue="variant" className="w-full">
                                    <TabsList className="ml-auto">
                                        <TabsTrigger value="variant">Variant</TabsTrigger>
                                        {/* <TabsTrigger value="seo">SEO-Meta</TabsTrigger>
                                        <TabsTrigger value="ai">AI-Meta</TabsTrigger> */}
                                    </TabsList>
                                    <TabsContent value="variant">
                                        <VariantPromptContent
                                            editedVariant={editedVariant}
                                            setEditedVariant={setEditedVariant}
                                            onSubmit={handleSubmit}
                                            originPost={post}
                                        />
                                    </TabsContent>
                                    <TabsContent value="seo">
                                        <TabSeoContent
                                            seoMeta={editedVariant?.seoMeta as SEOMetadata}
                                            setEditedPost={setEditedVariant}
                                            markdownContent={editedVariant?.content ?? ''}
                                            extras={{
                                                //siteName: 'Example Site Name',
                                                imageUrl: editedPost?.coverImage ?? ''
                                            }}
                                        />
                                    </TabsContent>
                                    <TabsContent value="ai">
                                        <TabAiMetaContent
                                            aiMeta={editedVariant?.aiMeta as AIMetadata}
                                            setEditedPost={setEditedVariant}
                                            markdownContent={editedVariant?.content ?? ''}
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
                                        <TabPostGeneralContent
                                            editedPost={editedPost}
                                            setEditedPost={setEditedPost}
                                        />
                                    </TabsContent>
                                    <TabsContent value="seo">
                                        <TabSeoContent
                                            seoMeta={editedPost?.seoMeta as SEOMetadata}
                                            setEditedPost={setEditedPost}
                                            markdownContent={editedPost?.content ?? ''}
                                            extras={{
                                                //siteName: post.site.name,
                                                imageUrl: editedPost?.coverImage ?? ''
                                            }}
                                        />
                                    </TabsContent>
                                    <TabsContent value="ai">
                                        <TabAiMetaContent
                                            aiMeta={editedPost?.aiMeta as AIMetadata}
                                            setEditedPost={setEditedPost}
                                            markdownContent={editedPost?.content ?? ''}
                                        />
                                    </TabsContent>
                                </Tabs>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default PostPage;
