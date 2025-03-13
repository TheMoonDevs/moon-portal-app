'use client';

import React, { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';
import { Post, Site } from '@prisma/client';
import { useParams } from 'next/navigation';
import { PortalSdk } from '@/utils/services/PortalSdk';
import dayjs from 'dayjs';

const SiteDashboard: React.FC = () => {
    const [sites, setSites] = useState<Site[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);
    const params = useParams();
    const siteId = params?.site_id as string;

    useEffect(() => {
        fetchSites(siteId);
    }, [siteId]);

    const fetchSites = async (_siteId: string) => {
        try {
            const data = await PortalSdk.getData('/api/sites', {});
            const _selectedSite = data.find((site: Site) => site.id === _siteId);
            setSelectedSite(_selectedSite);
            setSites(data);
        } catch (error) {
            console.error('Failed to fetch sites', error);
        }
    };

    const fetchPosts = async (siteId: string) => {
        try {
            const data = await PortalSdk.getData('/api/posts', { siteId });
            setPosts(data);
        } catch (error) {
            console.error('Failed to fetch posts', error);
        }
    };

    const handleSiteSelect = (site: Site) => {
        setSelectedSite(site);
        fetchPosts(site.id);
    };

    const handleAddPost = async () => {
        if (!selectedSite) return;
        try {
            const data = await PortalSdk.postData(`/api/sites/posts`, {
                siteId: selectedSite.id,
                slug: newPost.title.replaceAll(' ', '-').replaceAll('.', '-').replaceAll('/', '-') + "-" + dayjs().format('YYYY-MM-DD'),
                ...newPost
            });
            setPosts([...posts, data]);
            setNewPost({ title: '', content: '' });
        } catch (error) {
            console.error('Failed to add post', error);
        }
    };

    const handleDeletePost = async () => {
        if (!postToDelete || !selectedSite) return;
        try {
            await PortalSdk.deleteData(`/api/sites/posts`, {
                id: postToDelete.id
            });
            setPosts(posts.filter(post => post.id !== postToDelete.id));
            setShowDeleteDialog(false);
            setPostToDelete(null);
        } catch (error) {
            console.error('Failed to delete post', error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Site Dashboard</h1>
            <div className="flex space-x-4">
                <div className="w-1/3">
                    <h2 className="text-xl font-semibold mb-2">Sites</h2>
                    <ul className="list-disc pl-5">
                        {sites.map(site => (
                            <li key={site.id} onClick={() => handleSiteSelect(site)} className="cursor-pointer hover:underline">
                                {site.siteName}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-2/3">
                    {selectedSite && (
                        <>
                            <h2 className="text-xl font-semibold mb-2">Posts for {selectedSite.siteName}</h2>
                            <ul className="list-disc pl-5">
                                {posts.map(post => (
                                    <li key={post.id} className="flex justify-between">
                                        <span>{post.title}</span>
                                        <button
                                            className="text-red-500 hover:underline"
                                            onClick={() => {
                                                setPostToDelete(post);
                                                setShowDeleteDialog(true);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Add New Post</h3>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={newPost.title}
                                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                    className="border p-2 mb-2 w-full"
                                />
                                <textarea
                                    placeholder="Content"
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    className="border p-2 mb-2 w-full"
                                />
                                <button
                                    onClick={handleAddPost}
                                    className="bg-blue-500 text-white p-2 rounded"
                                >
                                    Add Post
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showDeleteDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-4 rounded shadow-lg">
                        <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
                        <p>Are you sure you want to delete the post titled "{postToDelete?.title}"?</p>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                className="bg-gray-300 p-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePost}
                                className="bg-red-500 text-white p-2 rounded"
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
