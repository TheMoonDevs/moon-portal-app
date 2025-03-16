import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AIMetadata, exampleAIMetadata } from './types';
import { toast } from 'sonner';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Skeleton } from '@mui/material';
import { Loader2 } from 'lucide-react';
interface TabAiMetaContentProps {
    aiMeta: AIMetadata | null;
    setEditedPost: React.Dispatch<React.SetStateAction<any | null>>;
    markdownContent: string;
}

const TabAiMetaContent: React.FC<TabAiMetaContentProps> = ({
    aiMeta,
    setEditedPost,
    markdownContent,
}) => {

    const [isGenerating, setIsGenerating] = useState(false);
    const handleGenerateAIMeta = async () => {
        setIsGenerating(true);
        PortalSdk.postData('/api/sites/generate', { content: markdownContent, type: 'ai' }).then((res) => {
            console.log(res);
            if (res.error) {
                toast.error(res.error);
                return;
            }
            setEditedPost((prev: any) => ({
                ...prev!,
                aiMeta: res.ai,
            }));
            toast.success('AI Meta generated successfully');
        }).catch((err) => {
            console.error(err);
            toast.error('Failed to generate AI Meta');
        }).finally(() => {
            setIsGenerating(false);
        });
    }

    return (
        <div className="mt-4 flex flex-col gap-2">
            {Object.entries(exampleAIMetadata).map(([key, value]) => (
                <div key={key}>
                    <label
                        htmlFor={key}
                        className="text-xs text-neutral-500"
                    >
                        {key}
                    </label>
                    {isGenerating ? (
                        <Skeleton className="h-4 w-full" variant="rounded" height={40} />
                    ) : (
                        <input
                            id={key}
                            type="text"
                            value={
                                Array.isArray(value)
                                    ? (aiMeta as any)?.[
                                        key as keyof AIMetadata
                                    ]?.join(', ')
                                    : (aiMeta as any)?.[
                                    key as keyof AIMetadata
                                    ]
                            }
                            onChange={(e) =>
                                setEditedPost((prev: any) => {
                                    const aiMeta = prev?.aiMeta as AIMetadata;
                                    aiMeta[key as keyof AIMetadata] = Array.isArray(
                                        value,
                                    )
                                        ? e.target.value
                                            .split(',')
                                            .map((tag) => tag.trim()) as any
                                        : e.target.value;
                                    return { ...prev!, aiMeta };
                                })
                            }
                            className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                        />
                    )}
                </div>
            ))}
            <div className="mt-4 flex flex-row gap-2">
                <Button
                    variant={'ghost'}
                    onClick={() =>
                        setEditedPost((prev: any) => ({
                            ...prev!,
                            aiMeta: exampleAIMetadata,
                        }))
                    }
                    className="bg-neutral-200"
                    disabled={isGenerating}
                >
                    Use Example
                </Button>
                <Button
                    variant={'ghost'}
                    className="bg-neutral-200"
                    onClick={handleGenerateAIMeta}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Generate New'
                    )}
                </Button>
            </div>
        </div>
    );
};

export default TabAiMetaContent; 