import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const buffer = fs.readFileSync('public/019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
    
    console.log("Calling Gemini...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this audio file accurately. Separate the transcription into utterances by speaker and sentence. Return a JSON structure under "results" with an "utterances" array. Each utterance should have "transcript", "start" (start time in seconds as number), "end" (end time in seconds as number), and "speaker" (0 or 1).' },
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: buffer.toString('base64')
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.OBJECT,
              properties: {
                utterances: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      transcript: { type: Type.STRING },
                      start: { type: Type.NUMBER },
                      end: { type: Type.NUMBER },
                      speaker: { type: Type.INTEGER }
                    },
                    required: ["transcript", "start", "end", "speaker"]
                  }
                }
              },
              required: ["utterances"]
            }
          },
          required: ["results"]
        }
      }
    });
    
    console.log("Success!");
    console.log(response.text);
  } catch (e: any) {
    console.error("Error details:", e.message || e);
  }
}
test();
