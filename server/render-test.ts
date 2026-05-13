import express from 'express';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs';

export const renderTestRouter = express.Router();

renderTestRouter.post('/api/hyperframes-render-test', async (req, res) => {
  console.log('Route hit: /api/hyperframes-render-test at ' + new Date().toISOString());
  const compPath = '/tmp/composition.html';
  const outPath = '/tmp/test.mp4';
  
  const html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; background: black; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
        #text { color: white; font-size: 100px; font-family: sans-serif; font-weight: bold; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
</head>
<body>
    <div id="text">TEST</div>
    <script>
        window.startAnim = () => {
             gsap.globalTimeline.pause();
             gsap.to("#text", { scale: 1.5, duration: 2, ease: "linear" });
        };
        window.seekAnim = (t) => {
             gsap.globalTimeline.seek(t);
        };
    </script>
</body>
</html>`;

  await fs.promises.writeFile(compPath, html);

  const stats = {
     approachA: false,
     approachAError: '',
     approachB: false,
     approachBError: '',
     timeMs: 0,
     fileSize: 0,
     mp4Base64: ''
  };

  const startTime = Date.now();

  try {
     await new Promise((resolve, reject) => {
         const p = spawn('npx', ['hyperframes', 'render', compPath, '--output', outPath], { stdio: 'ignore' });
         p.on('close', code => {
             if (code === 0) resolve(undefined); else reject(new Error('exit code ' + code));
         });
         p.on('error', err => reject(err));
     });
     stats.approachA = true;
  } catch (e: any) {
     stats.approachAError = e.message;
  }

  if (!stats.approachA) {
      try {
          const browser = await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: { width: 1080, height: 1920 },
            executablePath: await chromium.executablePath(),
            headless: (chromium as any).headless === true ? true : (chromium as any).headless,
          });
          const page = await browser.newPage();
          await page.goto('file://' + compPath);
          await page.evaluate(() => (window as any).startAnim());

          const ffmpeg = spawn(ffmpegStatic || 'ffmpeg', [
              '-y',
              '-f', 'image2pipe',
              '-vcodec', 'png',
              '-r', '30',
              '-i', '-',
              '-f', 'lavfi',
              '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              '-shortest',
              outPath
          ]);

          let ffmpegError = '';
          ffmpeg.stderr.on('data', d => ffmpegError += d.toString());

          for (let i = 0; i < 60; i++) {
              await page.evaluate((frame) => (window as any).seekAnim(frame / 30), i);
              const buffer = await page.screenshot({ type: 'png' });
              ffmpeg.stdin.write(buffer);
          }
          ffmpeg.stdin.end();

          await new Promise((resolve, reject) => {
              ffmpeg.on('close', code => code === 0 ? resolve(undefined) : reject(new Error(ffmpegError)));
          });

          await browser.close();
          stats.approachB = true;
      } catch (e: any) {
          stats.approachBError = e.message;
      }
  }

  if (stats.approachA || stats.approachB) {
      try {
          const buffer = await fs.promises.readFile(outPath);
          stats.fileSize = buffer.length;
          stats.mp4Base64 = buffer.toString('base64');
      } catch (e) {
          // ignore
      }
  }

  stats.timeMs = Date.now() - startTime;
  
  // Cleanup
  try { await fs.promises.unlink(compPath); } catch (e) {}
  try { await fs.promises.unlink(outPath); } catch (e) {}

  res.json(stats);
});

renderTestRouter.post('/api/render-test', async (req, res) => {
  console.log('Route hit: /api/render-test at ' + new Date().toISOString());
  let puppeteerResult = '';
  let sparticuzResult = '';
  let base64Image = '';

  // 1. Try standard puppeteer
  try {
    // Dynamically import to prevent immediate failure since install failed
    // @ts-ignore
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const screenshot = await page.screenshot({ encoding: 'base64' });
    base64Image = screenshot as string;
    await browser.close();
    puppeteerResult = "Success";
  } catch (error: any) {
    puppeteerResult = "Failed: " + error.message;
  }

  // 2. If puppeteer failed, try @sparticuz/chromium
  if (puppeteerResult.startsWith('Failed') || !base64Image) {
    try {
      const browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: (chromium as any).headless === true ? true : (chromium as any).headless,
      });
      const page = await browser.newPage();
      await page.goto('https://example.com');
      const screenshot = await page.screenshot({ encoding: 'base64' });
      base64Image = screenshot as string;
      await browser.close();
      sparticuzResult = "Success";
    } catch (error: any) {
      sparticuzResult = "Failed: " + error.message;
    }
  }

  return res.json({
    puppeteerResult,
    sparticuzResult,
    success: !!base64Image,
    image: base64Image ? `data:image/png;base64,${base64Image}` : null,
  });
});

// A standalone server for local execution if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = express();
  app.use(express.json());
  app.use(renderTestRouter);
  app.listen(3001, () => {
    console.log("Test server running on port 3001");
  });
}
