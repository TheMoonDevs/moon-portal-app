import React from 'react';
import { Button } from '@/components/ui/button';
import { AIMetadata } from './types';
import { Post } from '@prisma/client';

interface TabAiMetaContentProps {
    aiMeta: AIMetadata | null;
    setEditedPost: React.Dispatch<React.SetStateAction<any | null>>;
    exampleAIMetadata: AIMetadata;
}

const TabAiMetaContent: React.FC<TabAiMetaContentProps> = ({
    aiMeta,
    setEditedPost,
    exampleAIMetadata,
}) => {
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
                                        .map((tag) => tag.trim())
                                    : e.target.value;
                                return { ...prev!, aiMeta };
                            })
                        }
                        className="w-full rounded rounded-lg border p-2 text-sm outline-none"
                    />
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
                >
                    Use Example
                </Button>
                <Button
                    variant={'ghost'}
                    className="bg-neutral-200"
                    onClick={() =>
                        setEditedPost((prev: any) => ({
                            ...prev!,
                            aiMeta: exampleAIMetadata,
                        }))
                    }
                >
                    Generate New
                </Button>
            </div>
        </div>
    );
};

export default TabAiMetaContent; 