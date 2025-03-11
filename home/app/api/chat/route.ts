import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@/prisma/prisma';

export const runtime = 'edge';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const TOTAL_TOKEN_LIMIT = 1000;

export async function POST(req: Request) {
  const request = await req.json();
  // const prevConfigData = await prisma.configData.findFirst({
  //   where: { configId: `chatbot-${request.id}` },
  // });

  //console.log(request);

  // if ((prevConfigData?.configData as any).tokenUsage > TOTAL_TOKEN_LIMIT) {
  //   return new Response(
  //     JSON.stringify({
  //       error: 'Token limit exceeded',
  //       action: 'book_call',
  //       totalTokens: (prevConfigData?.configData as any).tokenUsage,
  //     }),
  //     {
  //       status: 400,
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  // }

  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: `You're a tech advisor for our platform. first chat & get users requirements in 2-3 questions, 
    at the end, analyze the user's project idea and recommend:
  
    1. Tech Stack - Choose technologies based on scalability, security, and speed.
    2. Best Plan - Select the most suitable MVP/Unit-Based option with a clear explanation.
    3. Team - Suggest key developer roles and required skills that our platform offers included in the plan.
  
    Available MVP Plans:
    - Simpleton MVP ($3,999, 3-4 weeks): Fixed-price package with a simple end-to-end solution (design, build, deploy), up to 2x complexity, and 2 free consults with fractional CTOs. Includes weekly syncs, progress tracking, and long-term bug-fix support.
    - Premium MVP ($2,999+/week): Scales up the Simpleton MVP, handling up to 4x complexity with double speed and efficiency, daily worklogs, 4+ hours of timezone overlap, and direct team communication. Also offers investor network access and an intensive MVP sprint approach.
    - Complex MVP (Custom Pricing): Tailored for high-security and high-performance projects, supporting up to 10x complexity, 99.99% on-time sprints, and a dedicated fractional CTO. Provides multi-region dev team support, in-house AI security models, and SLA-backed long-term scaling solutions.
  
    Unit-Based Hiring:
    - Fullstack Developer: Senior developers with 6+ years of experience across industries and stacks. $32 - $52 per hour.
    - Fractional CTO: Consult with industry experts for guidance and tech advice. $150 - $400 per hour.
    - DevOps Engineer: Automate and architect cloud infrastructure. $38 - $92 per hour.
    - UX/UI Engineer: Hybrid developers with stunning design skills. $36 - $85 per hour.
    - Code Review: Expert AI-driven code review at $25 per ~3k codelines.
    - Tech Lead: Train your startup tech team. $8k - $16k per month.
  
    If unsure, users can book a free consultation.
  
    Keep responses concise (under 200 tokens) and provide a directly actionable recommendation.`,
    messages: request.messages,
    maxTokens: 125,
    onStepFinish: async (step) => {
      console.log('Step finished:', step);
      // const updatedUsage = {
      //   tokenUsage:
      //     ((prevConfigData?.configData as any)?.tokenUsage ?? 0) +
      //     step.usage.totalTokens,
      // };
      // prisma.configData.upsert({
      //   where: { configId: `chatbot-${request.id}` },
      //   update: { configData: updatedUsage },
      //   create: { configId: 'chatbot-step', configData: updatedUsage },
      // });
    },
    onError: (error) => {
      console.error('An error occurred:', error);
    },
  });

  return result.toDataStreamResponse();
}
