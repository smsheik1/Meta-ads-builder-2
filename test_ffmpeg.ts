import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegPath!);

console.log("Creating dummy video...");
// generate a 1 second black video (no audio)
ffmpeg()
  .input('color=c=black:s=640x480:r=30')
  .inputFormat('lavfi')
  .inputOptions(['-t 1'])
  .outputOptions([
    '-c:v libx264',
    '-c:a aac'
  ])
  .on('end', () => console.log('Done mapping with aac on video-only input.'))
  .on('error', (err) => console.log('Error:', err.message))
  .save('tmp/test_lavfi.mp4');
