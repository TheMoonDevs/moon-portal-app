'use client';

import React, { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';
import { Post, Site } from '@prisma/client';
import { useParams, useRouter } from 'next/navigation';
import { PortalSdk } from '@/utils/services/PortalSdk';
import dayjs from 'dayjs';
import { useUser } from '@/utils/hooks/useUser';
import {
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    CircleIcon,
    CirclePlusIcon,
    Loader2,
    PlusIcon,
    TrashIcon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { DialogHeader } from '@/components/elements/dialog';
import { DialogActions, Input } from '@mui/material';
import { toast, Toaster } from 'sonner';
import useSWR from 'swr';

const SiteDashboard: React.FC = () => {
    const { user } = useUser();
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);
    const params = useParams();
    const siteId = params?.site_id as string;
    const router = useRouter();

    const [showNewSiteDialog, setShowNewSiteDialog] = useState(false);
    const [newSite, setNewSite] = useState({
        siteName: '',
        description: '',
        subDomain: '',
    });

    const [showSiteDeleteDialog, setShowSiteDeleteDialog] = useState(false);

    const {
        data: sites,
        error: sitesError,
        isLoading: isSitesLoading,
        mutate: mutateSites,
    } = useSWR('/api/sites', (url: string) => {
        return PortalSdk.getData(url, {});
    });

    useEffect(() => {
        if (sites?.length > 0) {
            handleSiteSelect(sites?.[0]);
        }
    }, [sites]);

    const {
        data: posts,
        error: postsError,
        mutate: mutatePosts,
        isLoading: isPostsLoading,
    } = useSWR(
        selectedSite || sites?.length > 0
            ? `/api/sites/posts?siteId=${selectedSite?.id ?? sites?.[0]?.id}`
            : null,
        (url: string) => {
            return PortalSdk.getData(url, {});
        },
    );

    const handleSiteSelect = (site: Site) => {
        setSelectedSite(site);
    };

    const handleAddPost = async () => {
        if (!selectedSite) return toast.error('No site selected');
        toast.promise(
            async () => {
                try {
                    const data = await PortalSdk.postData(`/api/sites/posts`, {
                        siteId: selectedSite.id,
                        author: user?.id,
                        title: 'New Blog Title',
                        excerpt: 'New Blog Excerpt',
                        slug: 'new-blog-title-' + dayjs().format('YYYY-MM-DD'),
                    });
                    mutatePosts([...posts, data]);
                    router.push(`/sites/${selectedSite.id}/post/${data.id}`);
                } catch (error) {
                    console.error('Failed to add post', error);
                }
            },
            {
                loading: 'Adding post...',
                success: 'Post added successfully!',
                error: 'Failed to add post!',
            },
        );
    };

    const handleDeletePost = async () => {
        if (!postToDelete || !selectedSite) return;
        try {
            await PortalSdk.deleteData(`/api/sites/posts`, {
                id: postToDelete.id,
            });
            mutatePosts(posts.filter((post: Post) => post.id !== postToDelete.id));
            setShowDeleteDialog(false);
            setPostToDelete(null);
        } catch (error) {
            console.error('Failed to delete post', error);
        }
    };

    const handleAddSite = async () => {
        if (!newSite.siteName || !newSite.subDomain) return toast.error('Please fill in all fields');
        setShowNewSiteDialog(false);
        toast.promise(
            async () => {
                try {
                    const response = await PortalSdk.postData('/api/sites', newSite);
                    if (response) {
                        mutateSites([...sites, response]);
                        setNewSite({ siteName: '', description: '', subDomain: '' });
                    }
                } catch (error) {
                    console.error('Failed to add site', error);
                    throw error;
                }
            },
            {
                loading: 'Adding site...',
                success: 'Site added successfully!',
                error: 'Failed to add site!',
            },
        );
    };

    const handleDeleteSite = async () => {
        if (!selectedSite) return;
        setShowSiteDeleteDialog(false);
        toast.promise(
            async () => {
                try {
                    const response = await PortalSdk.deleteData('/api/sites', {
                        id: selectedSite.id,
                    });
                    if (response) {
                        mutateSites();
                        setSelectedSite(null);
                    }
                } catch (error) {
                    console.error('Failed to delete site', error);
                    throw error;
                }
            },
            {
                loading: 'Deleting site...',
                success: 'Site deleted successfully!',
                error: 'Failed to delete site!',
            },
        );
    };

    return (
        <div className="p-4">
            <Toaster />
            <div className="grid grid-cols-6 space-x-4">
                <div className="col-span-1 h-[95vh] rounded-xl bg-neutral-100 p-4">
                    <Link
                        href={`/sites`}
                        className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide hover:opacity-50"
                    >
                        <ArrowLeftIcon size={16} />
                        Sites
                    </Link>
                    {isSitesLoading && (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="animate-spin" />
                        </div>
                    )}
                    {!isSitesLoading && (
                        <ul className="list-disc py-1">
                            {sites?.map((site: Site) => (
                                <li
                                    key={site.id}
                                    onClick={() => handleSiteSelect(site)}
                                    className={`flex cursor-pointer items-center gap-2 rounded-md p-2 px-4 hover:opacity-90 ${site.id === selectedSite?.id
                                        ? 'bg-blue-500 font-bold text-white'
                                        : 'bg-transparent text-black'
                                        }`}
                                >
                                    {site.siteName}
                                    {site.id === selectedSite?.id && (
                                        <ChevronRightIcon size={16} className="text-white" />
                                    )}
                                </li>
                            ))}
                            <Dialog open={showNewSiteDialog} onOpenChange={setShowNewSiteDialog}>
                                <DialogTrigger>
                                    <li className="flex cursor-pointer items-center gap-2 rounded-md p-2 px-4 hover:opacity-90">
                                        <PlusIcon size={16} />
                                        New Site
                                    </li>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className='text-xl font-bold'>New Site</DialogTitle>
                                    </DialogHeader>
                                    <DialogDescription>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold">
                                                    Site Name*
                                                </label>
                                                <input
                                                    className="text-md font-bold w-full rounded-md border border-neutral-300 p-2"
                                                    type="text"
                                                    placeholder="Site Name"
                                                    value={newSite.siteName}
                                                    onChange={(e) =>
                                                        setNewSite({ ...newSite, siteName: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold">
                                                    Sub Domain* ({newSite.subDomain}.themoondevs.com)
                                                </label>
                                                <input
                                                    className="text-md font-bold w-full rounded-md border border-neutral-300 p-2"
                                                    type="text"
                                                    placeholder="Sub Domain"
                                                    value={newSite.subDomain}
                                                    onChange={(e) =>
                                                        setNewSite({
                                                            ...newSite,
                                                            subDomain: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold">
                                                    Description (optional)
                                                </label>
                                                <textarea
                                                    className="text-md font-bold w-full rounded-md border border-neutral-300 p-2"
                                                    placeholder="Description"
                                                    value={newSite.description}
                                                    onChange={(e) =>
                                                        setNewSite({
                                                            ...newSite,
                                                            description: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </DialogDescription>
                                    <DialogFooter>
                                        <Button type="submit" onClick={handleAddSite}>
                                            Create New Site
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </ul>
                    )}
                </div>
                <div className="col-span-5">
                    {selectedSite && (
                        <>
                            <Tabs defaultValue="posts" className="w-full">
                                <div className="jsutify-between col-span-2 flex w-full items-end py-4">
                                    {selectedSite ? (
                                        <div>
                                            <h1 className="text-2xl font-bold">
                                                {selectedSite.siteName}
                                            </h1>
                                            <p className="text-xs">
                                                {(selectedSite as Site).description}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex h-96 items-center justify-center"></div>
                                    )}
                                    <TabsList className="ml-auto">
                                        <TabsTrigger value="posts">Posts</TabsTrigger>
                                        <TabsTrigger value="site">Site Settings</TabsTrigger>
                                    </TabsList>
                                    <Button
                                        onClick={handleAddPost}
                                        className="ml-4 flex items-center gap-2 p-2 text-sm"
                                    >
                                        <CirclePlusIcon size={24} />
                                        New Post
                                    </Button>
                                </div>
                                <TabsContent value="posts">
                                    {isPostsLoading && (
                                        <div className="flex h-screen items-center justify-center">
                                            <Loader2 className="animate-spin" />
                                        </div>
                                    )}
                                    {!isPostsLoading && selectedSite && (
                                        <div className="grid grid-cols-3 gap-2 p-2">
                                            {posts?.map((post: Post) => (
                                                <div
                                                    onClick={() => {
                                                        router.push(
                                                            `/sites/${selectedSite.id}/post/${post.id}`,
                                                        );
                                                    }}
                                                    className="flex cursor-pointer flex-col items-center rounded-xl shadow-md hover:bg-white"
                                                >
                                                    <Image
                                                        src={
                                                            post.coverImage ?? '/images/gradientBanner.jpg'
                                                        }
                                                        className="h-40 w-full rounded-tl-xl rounded-tr-xl object-cover"
                                                        alt={post.title}
                                                        width={100}
                                                        height={100}
                                                    />
                                                    <div className="flex w-full flex-row items-end justify-between px-4 py-4">
                                                        <div>
                                                            <h4 className="text-md font-bold text-neutral-700">
                                                                {post.title}
                                                            </h4>
                                                            <p className="text-xs text-neutral-400">
                                                                {post.slug}
                                                            </p>
                                                        </div>
                                                        <button
                                                            className="rounded-xl p-2 text-xs text-red-500 hover:bg-red-50"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setPostToDelete(post);
                                                                setShowDeleteDialog(true);
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {posts?.length === 0 && (
                                                <div className="justify-left flex h-screen flex-col items-center text-left">
                                                    <h4 className="text-lg text-neutral-900">
                                                        No posts found.
                                                    </h4>
                                                    <p className="text-xs text-neutral-400">
                                                        Click new post to get started.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="site">
                                    <div className="flex h-[80vh] flex-col items-start justify-start gap-2 rounded-xl p-2">
                                        <h4 className="text-lg font-bold">Site Danger Actions</h4>
                                        <Button
                                            disabled={isSitesLoading}
                                            variant="destructive"
                                            onClick={() => setShowSiteDeleteDialog(true)}
                                        >
                                            <TrashIcon size={16} />
                                            Delete Site
                                        </Button>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </div>
            </div>

            {showDeleteDialog && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50 backdrop-blur-sm">
                    <div className="mx-auto max-w-md rounded rounded-xl bg-white p-4 shadow-lg">
                        <h3 className="mb-4 text-lg font-semibold">Confirm Delete</h3>
                        <p>
                            Are you sure you want to delete the post titled{' '}
                            <b>"{postToDelete?.title}"</b>?
                        </p>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                className="rounded bg-gray-300 p-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePost}
                                className="rounded bg-red-500 p-2 text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSiteDeleteDialog && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50 backdrop-blur-sm">
                    <div className="mx-auto max-w-md rounded rounded-xl bg-white p-4 shadow-lg">
                        <h3 className="mb-4 text-lg font-semibold">Confirm Delete</h3>
                        <p>
                            Are you sure you want to delete the site{' '}
                            <b>"{selectedSite?.siteName}"</b>?
                        </p>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => setShowSiteDeleteDialog(false)}
                                className="rounded bg-gray-300 p-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSite}
                                className="rounded bg-red-500 p-2 text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteDashboard;
