export type SEOMetadata = {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string[];
  canonicalUrl?: string;
  structuredData?: any;
};

export const exampleSeoMetadata: SEOMetadata = {
  metaTitle: 'Example Meta Title',
  metaDescription: 'Example Meta Description',
  ogTitle: 'Example Open Graph Title',
  ogDescription: 'Example Open Graph Description',
  ogImage: 'https://example.com/og-image.jpg',
  keywords: ['example', 'keyword', 'keyword2'],
  canonicalUrl: 'https://example.com',
  //   structuredData: {
  //     '@context': 'https://schema.org',
  //     '@type': 'Organization',
  //     name: 'Example Organization',
  //   },
};

export type AIMetadata = {
  contentType?: string; // Article, Tutorial, News etc
  topicTags?: string[]; // AI-generated topic classifications
  readingTime?: number; // Estimated reading time in minutes
  complexity?: string; // Basic, Intermediate, Advanced
  mainConcepts?: string[]; // Key concepts covered
  targetAudience?: string[]; // Intended reader personas
  sentiment?: string; // Overall tone/sentiment
  summary?: string; // AI-generated summary
  references?: any; // Related content/citations
};

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
