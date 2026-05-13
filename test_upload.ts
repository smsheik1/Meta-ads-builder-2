import fs from 'fs';

async function run() {
  const file = Buffer.alloc(1024 * 1024 * 10); // 10MB
  const blob = new Blob([file], { type: 'video/webm' });
  const formData = new FormData();
  formData.append('video', blob, 'video.webm');

  try {
    const res = await fetch('http://localhost:3000/api/convert-to-mp4', {
      method: 'POST',
      body: formData,
    });
    console.log(res.status, res.statusText);
  } catch (err) {
    console.error("Fetch threw", err);
  }
}
run();
