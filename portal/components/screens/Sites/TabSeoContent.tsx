import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exampleSeoMetadata, SEOMetadata } from './types';
import { toast } from 'sonner';
import { Skeleton } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { PortalSdk } from '@/utils/services/PortalSdk';
interface TabSeoContentProps {
    seoMeta: SEOMetadata | null;
    setEditedPost: React.Dispatch<React.SetStateAction<any | null>>;
    markdownContent: string;
    extras: {
        siteName?: string;
        imageUrl?: string;
    }
}

const TabSeoContent: React.FC<TabSeoContentProps> = ({ seoMeta, setEditedPost, markdownContent, extras }) => {

    const [isGenerating, setIsGenerating] = useState(false);
    const handleGenerateSEO = async () => {
        setIsGenerating(true);
        PortalSdk.postData('/api/sites/generate', { content: markdownContent, type: 'seo' }).then((res) => {
            console.log(res);
            if (res.error) {
                toast.error(res.error);
                return;
            }
            setEditedPost((prev: any) => ({
                ...prev!,
                seoMeta: {
                    ...res.seo,
                    ogImage: extras.imageUrl,
                    ogSiteName: extras.siteName,
                },
            }));
            toast.success('SEO generated successfully');
        }).catch((err) => {
            console.error(err);
            toast.error('Failed to generate SEO');
        }).finally(() => {
            setIsGenerating(false);
        });
    }

    return (
        <div>
            <div className="mt-4 flex flex-col gap-2">
                {Object.entries(exampleSeoMetadata).map(([key, value]) => (
                    <div key={key}>
                        <label htmlFor={key} className="text-xs text-neutral-500">
                            {key}
                        </label>
                        {isGenerating ? (
                            <Skeleton variant="rounded" height={40} width="100%" className='w-full' />
                        ) : (
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
                                            ? (e.target.value.split(',').map((tag) => tag.trim()) as any)
                                            : e.target.value;
                                        return { ...prev!, seoMeta: updatedSeoMeta };
                                    })
                                }
                                className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                            />
                        )}
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
                    disabled={isGenerating}
                >
                    Use Example
                </Button>
                <Button
                    variant={'ghost'}
                    className="bg-neutral-200 flex flex-row items-center gap-2"
                    onClick={handleGenerateSEO}
                    disabled={isGenerating}
                >
                    {isGenerating && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate New'}
                </Button>
            </div>
        </div>
    );
};

export default TabSeoContent; 