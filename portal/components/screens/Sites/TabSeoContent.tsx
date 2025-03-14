import React from 'react';
import { Button } from '@/components/ui/button';
import { SEOMetadata } from './types';
import { Post } from '@prisma/client';

interface TabSeoContentProps {
    seoMeta: SEOMetadata | null;
    setEditedPost: React.Dispatch<React.SetStateAction<any | null>>;
    exampleSeoMetadata: SEOMetadata;
}

const TabSeoContent: React.FC<TabSeoContentProps> = ({ seoMeta, setEditedPost, exampleSeoMetadata }) => {
    return (
        <div>
            <div className="mt-4 flex flex-col gap-2">
                {Object.entries(exampleSeoMetadata).map(([key, value]) => (
                    <div key={key}>
                        <label htmlFor={key} className="text-xs text-neutral-500">
                            {key}
                        </label>
                        <input
                            id={key}
                            type="text"
                            value={
                                Array.isArray(value)
                                    ? (seoMeta as any)?.[key as keyof SEOMetadata]?.join(', ')
                                    : (seoMeta as any)?.[key as keyof SEOMetadata]
                            }
                            onChange={(e) =>
                                setEditedPost((prev: any) => {
                                    const updatedSeoMeta = prev?.seoMeta as SEOMetadata;
                                    updatedSeoMeta[key as keyof SEOMetadata] = Array.isArray(value)
                                        ? e.target.value.split(',').map((tag) => tag.trim())
                                        : e.target.value;
                                    return { ...prev!, seoMeta: updatedSeoMeta };
                                })
                            }
                            className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                        />
                    </div>
                ))}
            </div>
            <div className="mt-4 flex flex-row gap-2">
                <Button
                    variant={'ghost'}
                    onClick={() =>
                        setEditedPost((prev: any) => ({
                            ...prev!,
                            seoMeta: exampleSeoMetadata,
                        }))
                    }
                    className="bg-neutral-200"
                >
                    Use Example
                </Button>
                <Button
                    variant={'ghost'}
                    className="bg-neutral-200"
                    onClick={() =>
                        setEditedPost((prev: any) => ({
                            ...prev!,
                            seoMeta: exampleSeoMetadata,
                        }))
                    }
                >
                    Generate New
                </Button>
            </div>
        </div>
    );
};

export default TabSeoContent; 