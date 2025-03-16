import {
  aiMetaDataModel,
  seoMetaDataModel,
} from '@/components/screens/Sites/types';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText, streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  // custom settings
});

export async function POST(req: Request) {
  const { content, type } = await req.json();

  const result = await generateObject({
    model: google('gemini-1.5-flash'),
    output: 'object',
    schema:
      type === 'seo'
        ? seoMetaDataModel
        : type === 'ai'
          ? aiMetaDataModel
          : z.any(),
    prompt: `
    Original content:
    ${content}
    `,
  });

  console.log(result.object);
  if (result.finishReason === 'length') {
    return NextResponse.json({
      error: 'High Token usage crossed: ' + result.usage.totalTokens,
    });
  }
  return NextResponse.json({
    seo: type === 'seo' ? result.object : null,
    ai: type === 'ai' ? result.object : null,
    genMeta: result.providerMetadata,
  });
}
