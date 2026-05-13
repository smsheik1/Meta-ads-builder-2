import fs from 'fs';

async function run() {
  const fileData = fs.readFileSync('public/019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
  
  const formData = new FormData();
  formData.append('audio', new Blob([fileData], { type: 'audio/mp3' }), 'audio.mp3');

  try {
    const res = await fetch('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData
    });

    const txt = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", txt);
  } catch (e) {
    console.error(e);
  }
}
run();
