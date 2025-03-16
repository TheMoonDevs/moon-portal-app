import { z } from 'zod';

export const seoMetaDataModel = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ogSiteName: z.string().optional(),
  //canonicalUrl: z.string().optional(),
});

export type SEOMetadata = z.infer<typeof seoMetaDataModel>;

export const exampleSeoMetadata: SEOMetadata = {
  metaTitle: 'Example Meta Title',
  metaDescription: 'Example Meta Description',
  ogTitle: 'Example Open Graph Title',
  ogDescription: 'Example Open Graph Description',
  ogImage: 'https://example.com/og-image.jpg',
  keywords: ['example', 'keyword', 'keyword2'],
  ogSiteName: 'Example Site Name',
  //canonicalUrl: 'https://example.com',
  //   structuredData: {
  //     '@context': 'https://schema.org',
  //     '@type': 'Organization',
  //     name: 'Example Organization',
  //   },
};

export const aiMetaDataModel = z.object({
  contentType: z.string().describe('Article, Tutorial, News etc').optional(),
  topicTags: z
    .array(z.string())
    .describe('AI-generated topic classifications')
    .optional(),
  readingTime: z
    .number()
    .describe('Reading time by Human in milliseconds')
    .optional(),
  complexity: z.string().describe('Basic / Intermediate / Advanced').optional(),
  mainConcepts: z.array(z.string()).describe('Key concepts covered').optional(),
  targetAudience: z
    .array(z.string())
    .describe('Intended reader personas')
    .optional(),
  sentiment: z.string().describe('Overall tone/sentiment').optional(),
  summary: z.string().describe('AI-generated summary').optional(),
  references: z
    .array(z.string())
    .describe('Related content/citations')
    .optional(),
});

export type AIMetadata = z.infer<typeof aiMetaDataModel>;
export const exampleAIMetadata: AIMetadata = {
  contentType: 'Article',
  topicTags: ['example', 'keyword', 'keyword2'],
  readingTime: 5,
  complexity: 'Intermediate',
  mainConcepts: ['example', 'keyword', 'keyword2'],
  targetAudience: ['example', 'keyword', 'keyword2'],
  sentiment: 'Positive',
  summary: 'This is a summary',
  references: ['example', 'keyword', 'keyword2'],
};
