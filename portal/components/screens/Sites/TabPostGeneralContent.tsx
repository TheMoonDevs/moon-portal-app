import { Post } from '@prisma/client';
import Image from 'next/image';
import React from 'react';

interface TabPostGeneralContentProps {
    editedPost: Post | null;
    setEditedPost: React.Dispatch<React.SetStateAction<Post | null>>;
}

const TabPostGeneralContent: React.FC<TabPostGeneralContentProps> = ({
    editedPost,
    setEditedPost,
}) => {
    return (
        <div className="mt-4 flex flex-col gap-2">
            <div>
                <label htmlFor="title" className="text-xs text-neutral-500">
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
                <label htmlFor="slug" className="text-xs text-neutral-500">
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
                <label htmlFor="image_cover" className="text-xs text-neutral-500">
                    Cover Image (put in the editor)
                </label>
                <Image
                    src={editedPost?.coverImage ?? '/images/gradientBanner.jpg'}
                    className="h-40 w-full rounded-lg object-cover"
                    alt="Cover Image"
                    width={100}
                    height={100}
                />
            </div>
            <div>
                <label htmlFor="excerpt" className="text-xs text-neutral-500">
                    Excerpt
                </label>
                <textarea
                    id="excerpt"
                    rows={4}
                    value={editedPost?.excerpt ?? ''}
                    onChange={(e) =>
                        setEditedPost((prev) => ({
                            ...prev!,
                            excerpt: e.target.value,
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Post excerpt"
                    autoComplete="off"
                />
            </div>
            <div>
                <label htmlFor="tags" className="text-xs text-neutral-500">
                    Tags
                </label>
                <input
                    id="tags"
                    type="text"
                    value={editedPost?.tags?.join(', ') ?? ''}
                    onChange={(e) =>
                        setEditedPost((prev) => ({
                            ...prev!,
                            tags: e.target.value.split(',').map((tag) => tag.trim()),
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Separate tags with commas"
                />
            </div>
            <div>
                <label htmlFor="category" className="text-xs text-neutral-500">
                    Category
                </label>
                <input
                    id="category"
                    type="text"
                    value={editedPost?.categories?.join(', ') ?? ''}
                    onChange={(e) =>
                        setEditedPost((prev) => ({
                            ...prev!,
                            categories: e.target.value.split(',').map((tag) => tag.trim()),
                        }))
                    }
                    className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    placeholder="Separate categories with commas"
                />
            </div>
        </div>
    );
};

export default TabPostGeneralContent; 