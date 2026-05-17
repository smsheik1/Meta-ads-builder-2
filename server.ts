import 'dotenv/config';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// Using port 3001 for Express so Vite can bind to 3000 as required in development.
// Hosts like Render provide PORT in production.
const port = Number(process.env.PORT) || (isProd ? 3000 : 3001);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a bit and try again.' },
});

const expensiveApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation/export requests. Please wait a bit and try again.' },
});

app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

const memoryStorage = multer.memoryStorage();
const uploadMem = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype === 'video/webm';
    if (!allowed) {
      cb(new Error('Unsupported audio file type.'));
      return;
    }
    cb(null, true);
  },
});

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.webm');
  }
});
const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: 300 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype === 'video/webm' || file.originalname.toLowerCase().endsWith('.webm');
    if (!allowed) {
      cb(new Error('Unsupported video file type.'));
      return;
    }
    cb(null, true);
  },
});

const sendServerError = (res: express.Response, fallbackMessage: string) => {
  res.status(500).json({ error: fallbackMessage });
};

app.post('/api/convert-to-mp4', expensiveApiLimiter, uploadDisk.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const inputPath = req.file.path;
  ffmpeg.setFfmpegPath(ffmpegPath!);

  const outputPath = inputPath.replace('.webm', '.mp4');
  
  ffmpeg(inputPath)
    .outputOptions([
      '-y',
      '-c:v libx264',
      '-preset ultrafast',
      '-profile:v main',
      '-pix_fmt yuv420p',
      '-c:a aac',
      '-b:a 128k',
      '-r 60'
    ])
    .outputFormat('mp4')
    .on('start', (commandLine) => {
      console.log('Spawned FFmpeg with command: ' + commandLine);
    })
    .on('stderr', (stderrLine) => {
      console.log('FFmpeg stderr: ' + stderrLine); // Don't suppress, helpful for debugging
    })
    .on('end', () => {
      fs.unlink(inputPath, () => {});
      res.download(outputPath, 'video.mp4', () => {
         fs.unlink(outputPath, () => {});
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      fs.unlink(inputPath, () => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to convert video' });
      }
    })
    .save(outputPath);
});

app.post('/api/transcribe', expensiveApiLimiter, uploadMem.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  if (!process.env.DEEPGRAM_API_KEY) {
    return res.status(500).json({ error: 'DEEPGRAM_API_KEY is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&utterances=true&diarize=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': req.file.mimetype || 'audio/wav',
      },
      body: req.file.buffer
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Deepgram transcription rejected request:', response.status, text.slice(0, 500));
      return res.status(response.status).json({ error: 'Transcription service rejected the request.' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return sendServerError(res, 'Transcription failed. Please try again.');
  }
});



app.post('/api/render-test', (req, res) => {
  res.json({ status: 'not implemented yet' });
});

app.post('/api/hyperframes-render-test', (req, res) => {
  res.json({ status: 'not implemented yet' });
});

import { GoogleGenAI } from '@google/genai';
import { getMasterPrompt } from './src/lib/prompts/headline-master';

const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
};

const gibberishPattern = /\b(?:[bcdfghjklmnpqrstvwxyz]{4,}|(?:asdf|sdfg|qwer|zxcv|hjkl|lorem|ipsum)[a-z]*)\b/i;

const hasGarbageText = (value: unknown) => {
  const text = String(value || '').trim();
  return !text || gibberishPattern.test(text) || /\bwiggly\b/i.test(text);
};

const normalizeDialogueScripts = (payload: any, count: number) => {
  const rawScripts = Array.isArray(payload?.scripts) ? payload.scripts : [];

  return rawScripts
    .map((script: any) => {
      const lines = Array.isArray(script?.lines)
        ? script.lines
            .map((line: any, index: number) => ({
              speaker: String(line?.speaker || (index % 2 === 0 ? 'Ava' : 'Sam')).trim(),
              tone: String(line?.tone || 'natural').trim(),
              text: String(line?.text || '').trim(),
            }))
            .filter((line: any) => {
              const words = line.text.split(/\s+/).filter(Boolean);
              return words.length >= 3 && words.length <= 28 && !hasGarbageText(line.text);
            })
        : [];

      return {
        title: String(script?.title || 'Conversation option').trim(),
        angle: String(script?.angle || 'Problem and solution').trim(),
        lines,
      };
    })
    .filter((script: any) => {
      const combined = [
        script.title,
        script.angle,
        ...script.lines.map((line: any) => line.text),
      ].join(' ');
      const repeatsSpeaker = script.lines.some((line: any, index: number) => (
        index > 0 && line.speaker.toLowerCase() === script.lines[index - 1].speaker.toLowerCase()
      ));
      return script.lines.length >= 4 && !repeatsSpeaker && !hasGarbageText(combined);
    })
    .slice(0, count);
};

const fillDialogueScripts = (scripts: any[], count: number) => {
  const fallbacks = fallbackDialogueScripts(count);
  const combined = [...scripts];
  for (const fallback of fallbacks) {
    if (combined.length >= count) break;
    if (!combined.some((script) => script.title === fallback.title)) {
      combined.push(fallback);
    }
  }
  return combined.slice(0, count);
};

const fallbackDialogueScripts = (count: number) => {
  const scripts = [
    {
      title: 'Missed Call Recovery',
      angle: 'The practice is already paying for leads it never answers.',
      lines: [
        { speaker: 'Ava', tone: 'concerned', text: 'We missed three new patient calls during lunch again.' },
        { speaker: 'Sam', tone: 'calm', text: 'That is exactly why the AI front desk answers when the team cannot.' },
        { speaker: 'Ava', tone: 'curious', text: 'So it can book the patient before they call another office?' },
        { speaker: 'Sam', tone: 'assured', text: 'Yes. It answers, follows up, and keeps the appointment moving.' },
      ],
    },
    {
      title: 'After Hours Calls',
      angle: 'Patients call outside normal hours and still expect a response.',
      lines: [
        { speaker: 'Ava', tone: 'frustrated', text: 'The best leads keep calling after we close.' },
        { speaker: 'Sam', tone: 'practical', text: 'Then stop making business hours the only time you can book.' },
        { speaker: 'Ava', tone: 'thoughtful', text: 'An AI receptionist could answer those calls at night?' },
        { speaker: 'Sam', tone: 'calm', text: 'And follow up automatically so the patient does not disappear.' },
      ],
    },
    {
      title: 'No More Hiring',
      angle: 'More staff is not always the cleanest fix.',
      lines: [
        { speaker: 'Ava', tone: 'tired', text: 'I do not want to hire another front desk person.' },
        { speaker: 'Sam', tone: 'steady', text: 'Then cover the gaps instead of adding another payroll problem.' },
        { speaker: 'Ava', tone: 'interested', text: 'So the AI handles missed calls and follow up?' },
        { speaker: 'Sam', tone: 'confident', text: 'Exactly. Your team stays focused while the calls still get answered.' },
      ],
    },
  ];

  return scripts.slice(0, count);
};

const pcmBase64ToWavBase64 = (pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString('base64');
};

app.post('/api/generate-headlines', expensiveApiLimiter, async (req, res) => {
  try {
    const { niche, count = 20 } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `${getMasterPrompt(niche)}

Generate ${count} headlines mixed across frameworks A-J. 
Return ONLY a JSON array: [{"text": "...", "framework": "A"}, ...]
No prose. No explanation. Just the JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '[]';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Generate headlines error:", error);
    sendServerError(res, 'Error generating headlines.');
  }
});

app.post('/api/generate-copy', expensiveApiLimiter, async (req, res) => {
  try {
    const { businessContext } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    
    // Fallback to fetch if required or let SDK handle it.
    const ai = new GoogleGenAI({ apiKey: key });
    
    const prompt = `# DENTAL HEADLINE GENERATOR

## ROLE
Direct-response copywriter. 10,000+ winning Meta ad headlines for dental clinic owners. Write like Schwartz, Ogilvy, Goff. Pain-aware, specific, scroll-stopping.

## THE READER
Dr. Michael Carter, 42. Owns his practice. Makes $450k/year, feels stuck. On his couch at 9pm Tuesday, scrolling Instagram, tired, just lost 3 patients to missed calls today.

**His real pain:**
- Front desk is the bottleneck, can't fix it
- Hired more, paid more, trained more — nothing sticks
- Watching competitors grow while he's stuck
- Doesn't want more leads — wants to stop bleeding the ones he has

**Already tried (don't pitch):** more receptionists, call centers, marketing agencies, software.

**Secret beliefs (break or weaponize one):**
- "More leads will fix it"
- "I just need better staff"
- "AI will sound robotic"
- "Growth requires more employees"

## THE OFFER
AI front desk. 24/7. Answers, books, follows up. Sounds human. Fixes the $10k-50k/month silent revenue leak.

## RULES
1. **Hit the pain in the first 5 words.** No setup.
2. **Specific numbers, not vague claims.** "$14,000/month" beats "lose fewer calls."
3. **Name the enemy, not the solution.**
4. **Speak the inner monologue, not the surface complaint.**
5. **Break a belief in the headline itself.**
6. **Contrast/curiosity, not hype.** No "revolutionary."
7. **Max 12 words.**
8. **Sell removal of pain, not the AI.**

## HOOK FRAMEWORKS (Pick one for the headline)
**A. Math Bomb** — "3 missed calls a day = $147,000/year gone."
**B. Calling-Out** — "You don't have a marketing problem. You have a front desk problem."
**C. Belief-Break** — "Hiring another receptionist won't fix this. Here's why."
**D. Comparison-Shame** — "The dentist across town isn't smarter. He just answers his phone."
**E. Specific-Day Pain** — "Every Tuesday at 4:47pm, you lose a $3,200 case."
**F. Whisper-Doubt** — "You know your front desk is the bottleneck. You don't know what to do."
**G. Identity Reframe** — "Smart dentists stopped hiring receptionists in 2026."
**H. Reverse-Promise** — "Not for dentists who think more marketing fixes everything."
**I. Status-Quo Cost** — "Every month you wait, you lose another $12k."
**J. Specific-Win** — "Dr. Patel added $61k last month. Here's how."

## NEVER
- "Revolutionary," "game-changing," "cutting-edge"
- "Are you a dentist who..." / "Are you tired of..."
- "Boost your practice" / "grow your business"
- Make him feel stupid for not solving this yet

## THE TEST
Before outputting: "Would Dr. Carter, scrolling at 9:47pm Tuesday after a $3k loss day, stop his thumb?" If no, rewrite.

## OUTPUT FORMAT
Generate a single headline using one of the Hook Frameworks, and a matching sub-headline. Use the business context to flavor the copy.
Business Context:
"${businessContext}"

Return valid JSON with the following structure:
{
  "headline": "<your chosen headline, max 12 words>",
  "subhead": "<a compelling sub-headline expanding on the headline, max 15 words>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            headline: { type: "STRING" },
            subhead: { type: "STRING" },
          },
          required: ["headline", "subhead"],
        },
      }
    });

    if (!response.text) {
      return res.status(500).json({ error: "No text returned from Gemini." });
    }

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Generate error:", error);
    sendServerError(res, 'Error generating copy.');
  }
});

app.post('/api/generate-dialogue-scripts', expensiveApiLimiter, async (req, res) => {
  try {
    const { creativeBrief, persona = 'Dental practice owner', count = 5 } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const briefText = typeof creativeBrief === 'object'
      ? Object.entries(creativeBrief).map(([label, value]) => `${label}: ${value}`).join('\n')
      : String(creativeBrief || '');

    const prompt = `You are a direct-response creative strategist for Wiggly, a visual ad creator.

Create ${count} short two-person dialogue ad scripts for this brief.

Brief:
${briefText}

Persona: ${persona}

The ad should feel like a real-life overheard conversation, not a sales pitch.
One person has the problem. The other casually reveals the solution.
Keep each script 14-26 seconds when read aloud.
No hype. No buzzwords. No testimonials. No fake stats.
Do not include placeholder text, keyboard-mash text, filler words, lorem ipsum, or nonsensical tokens.
Every line must be fluent English that could be read aloud in the ad.
Never mention Wiggly. Wiggly is the internal builder, not the product being advertised.
Use the offer and CTA from the brief. If the brand name is unknown, say "the AI front desk" instead of inventing one.

Return ONLY valid JSON:
{
  "scripts": [
    {
      "title": "short option title",
      "angle": "short strategy angle",
      "lines": [
        {"speaker": "Ava", "tone": "frustrated", "text": "line"},
        {"speaker": "Sam", "tone": "calm", "text": "line"}
      ]
    }
  ]
}`;

    let scripts: any[] = [];

    for (let attempt = 0; attempt < 2 && scripts.length === 0; attempt += 1) {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous output failed quality checks. Return clean, fluent English only. Absolutely no placeholder or keyboard-mash text.`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{"scripts":[]}';
      scripts = normalizeDialogueScripts(parseJsonResponse(text), Number(count) || 5);
    }

    res.json({ scripts: fillDialogueScripts(scripts, Number(count) || 5) });
  } catch (error: any) {
    console.error("Generate dialogue scripts error:", error);
    sendServerError(res, 'Error generating dialogue scripts.');
  }
});

app.post('/api/generate-dialogue-audio', expensiveApiLimiter, async (req, res) => {
  try {
    const { script } = req.body;

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    if (!script?.lines?.length) {
      return res.status(400).json({ error: 'No script lines provided.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const speakers = Array.from(new Set(script.lines.map((line: any) => String(line.speaker || 'Speaker').trim()).filter(Boolean))).slice(0, 2) as string[];
    while (speakers.length < 2) speakers.push(`Speaker ${speakers.length + 1}`);
    const ttsText = `Read this as a natural, subtle, two-person conversation for a Meta ad. Keep it conversational and not salesy.\n\n${script.lines.map((line: any) => `${line.speaker}: [${line.tone || 'natural'}] ${line.text}`).join('\n')}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: ttsText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: speakers[0],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                },
              },
              {
                speaker: speakers[1],
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
              },
            ],
          },
        },
      },
    } as any);

    const part = response.candidates?.[0]?.content?.parts?.find((candidatePart: any) => candidatePart.inlineData);
    const inlineData = part?.inlineData;
    if (!inlineData?.data) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS.' });
    }

    const mimeType = inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
    const normalizedMimeType = mimeType.toLowerCase();
    const sampleRateMatch = normalizedMimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
    const channelsMatch = normalizedMimeType.match(/channels=(\d+)/);
    const channels = channelsMatch ? Number(channelsMatch[1]) : 1;
    const isPcm = normalizedMimeType.includes('audio/l16') || normalizedMimeType.includes('pcm');
    const audioBase64 = isPcm ? pcmBase64ToWavBase64(inlineData.data, sampleRate, channels) : inlineData.data;

    res.json({
      audioBase64,
      mimeType: isPcm ? 'audio/wav' : mimeType,
      filename: `${(script.title || 'conversation-ad').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'conversation-ad'}.wav`,
    });
  } catch (error: any) {
    console.error("Generate dialogue audio error:", error);
    sendServerError(res, 'Error generating dialogue audio.');
  }
});

if (isProd) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Request error:', err);

  if (res.headersSent) return;

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large.'
      : 'File upload failed.';
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  res.status(400).json({ error: 'Request could not be processed.' });
};

app.use(errorHandler);

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});
