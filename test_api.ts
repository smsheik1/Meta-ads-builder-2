import fs from 'fs';

async function run() {
  const blob = new Blob(["dummy"], { type: 'video/webm' });
  const formData = new FormData();
  formData.append('video', blob, 'video.webm');

  try {
    const res = await fetch('http://localhost:3000/api/convert-to-mp4', {
      method: 'POST',
      body: formData,
    });
    console.log(res.status, res.statusText);
    if (!res.ok) {
       console.error(await res.text());
    } else {
       console.log("Success");
    }
  } catch (err) {
    console.error("Fetch threw", err);
  }
}
run();
