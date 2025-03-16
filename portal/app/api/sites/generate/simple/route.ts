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
  const { content, type, variationPrompt } = await req.json();

  const result = await generateText({
    model: google('gemini-1.5-flash'),
    system: `
      You are a helpful assistant.
      You are given a content and a prompt as instruction.
      You need to generate a ${type} of the content.
      `,
    prompt: `
      Content:
      ${content}
      Variation prompt:
      ${variationPrompt}
      `,
  });

  return NextResponse.json({
    text: result.text,
  });
}
