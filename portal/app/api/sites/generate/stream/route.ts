import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  // custom settings
});

export async function POST(req: Request) {
  const { markdown, variancePrompt, varianceTags } = await req.json();

  //console.log(markdown, variancePrompt, varianceTags);
  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: `
    You are a helpful assistant.
    You are given a markdown file and a variance prompt as instruction.
    You need to generate in markdown format in message stream that is a variation of the original markdown file here.
    strip the \`\`\`markdown tags from the generated markdown.
    images should follow this syntax = ![alt_text](image_url)
    `,
    prompt: `
    Variance prompt:
    ${variancePrompt}
    tags:
    ${varianceTags}
    Original markdown:
    ${markdown}
    `,
    maxTokens: 200,
  });

  //console.log(result);

  return result.toDataStreamResponse();
}
