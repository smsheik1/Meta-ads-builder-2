import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// Using port 3001 for Express so Vite can bind to 3000 as required in development.
// In production, everything binds to port 3000.
const port = isProd ? 3000 : 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const memoryStorage = multer.memoryStorage();
const uploadMem = multer({ storage: memoryStorage });

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
const uploadDisk = multer({ storage: diskStorage });

app.post('/api/convert-to-mp4', uploadDisk.single('video'), (req, res) => {
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
      '-r 30'
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

app.post('/api/transcribe', uploadMem.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
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
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error.message });
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

app.post('/api/generate-headlines', async (req, res) => {
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

    const text = response.text() || '[]';
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Generate headlines error:", error);
    res.status(500).json({ error: error.message || 'Error generating headlines' });
  }
});

app.post('/api/generate-copy', async (req, res) => {
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
    res.status(500).json({ error: error.message || 'Error generating copy' });
  }
});

if (isProd) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});
