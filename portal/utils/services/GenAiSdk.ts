import { GoogleGenerativeAI } from "@google/generative-ai";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export const GenAiSdk = {
  generateWorklogSummary: async (
    heading: string,
    name: string | null | undefined,
    data: any
  ) => {
    const prompt = `
      Keep the title exactly this: ${heading}.
      The following are my work logs.
      ${JSON.stringify(data)}
      Now, help me write a detailed summary of all the work I did in third prespective.
      My name is ${name}. Also, include some stats and departments involved,
      projects involved and short bullet points of my key achievements. 
      Do not provide area of improvements and only use my first name not full name.`;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return text;
    } catch (e: any) {
      console.error(e);
      return e.message;
    }
  },
};
