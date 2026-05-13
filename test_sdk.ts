import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: "dummy" });
  console.log(typeof ai.models.generateContent);
}
test();
