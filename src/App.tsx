import React, { useState, useRef, useEffect } from 'react';
import { PlatformFrame, type PlatformType } from './components/PlatformFrame';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Upload, Play, Square, Save, Video, Database, CheckCircle2, Download, Settings, Layers, Loader2, X, Moon, Sun, Smartphone, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { useEditorStore } from './store';
import { drawAdvancedVisualizer } from './lib/visualizer';

const MOCK_CAPTIONS = [
  { text: "Are you missing calls?", start: 0, end: 2, speaker: 1 },
  { text: "Our AI receptionist can help.", start: 2.5, end: 4.5, speaker: 2 },
  { text: "Available 24/7.", start: 5, end: 6.5, speaker: 1 },
  { text: "Never miss a lead again.", start: 7, end: 9, speaker: 2 },
];

interface Template {
  name: string;
  headline: string;
  subhead: string;
  ctaText: string;
  visualizerColor: string;
  accentColor: string;
}

type RenderDurationCap = 30 | 60 | 'full';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single Template State
  const [headline, setHeadline] = useState("Never Miss a Lead Again.");
  const [subhead, setSubhead] = useState("Our AI Receptionist answers calls 24/7.");
  const [ctaText, setCtaText] = useState("BOOK A DEMO");
  const [visualizerColor, setVisualizerColor] = useState("#00ffcc");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [bgColor, setBgColor] = useState("#f5f5f5");

  // Platform Frame State
  const [platform, setPlatform] = useState<PlatformType>('vertical');
  const [platformTheme, setPlatformTheme] = useState<'light' | 'dark'>('dark');
  const [brandName, setBrandName] = useState('Agent Enamel');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [simulatedCaption, setSimulatedCaption] = useState('Check out our new AI receptionist feature! Never miss a lead and keep your customers happy.');
  const [autoCta, setAutoCta] = useState('Learn More');
  
  // Media State
  const [bgMedia, setBgMedia] = useState<{url: string, type: string} | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>('/019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
  const [audioFileName, setAudioFileName] = useState<string>('019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
  
  // Playback/Render State
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDurationCap, setRenderDurationCap] = useState<RenderDurationCap>(30);

  // Batch State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const { showSafeZones, setShowSafeZones, showRedGuides, setShowRedGuides, addElement } = useEditorStore();

  useEffect(() => {
    // Load templates from local storage
    const saved = localStorage.getItem('hyperframes_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
  }, []);

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgMedia({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
      setAudioFileName(file.name);
    }
  };

  useEffect(() => {
    // Intentionally skipped auto generation via `/api/generate-copy` 
    // Users can generate Ad Copy using the API key panel
  }, []);

  useEffect(() => {
    if (!audioUrl) {
      useEditorStore.getState().setCaptions([]);
      return;
    }

    const cacheKey = `transcription_${audioUrl}`;
    const cachedCaptions = localStorage.getItem(cacheKey);
    if (cachedCaptions) {
      try {
        useEditorStore.getState().setCaptions(JSON.parse(cachedCaptions));
        return;
      } catch(e) {}
    }

    const transcribeUrl = async () => {
      try {
        setIsTranscribing(true);
        const audioRes = await fetch(audioUrl);
        const audioBlob = await audioRes.blob();
        if (audioBlob.size < 100) return;
        
        const file = new File([audioBlob], 'audio.mp3', { type: audioBlob.type || 'audio/mpeg' });
        const formData = new FormData();
        formData.append('audio', file);
        
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
           const errorText = await res.text();
           console.error('Transcription API error:', res.status, errorText);
           alert('Transcription failed: ' + errorText.substring(0, 50));
           return;
        }

        const data = await res.json();
        const { setCaptions } = useEditorStore.getState();
        let newCaptions: any[] = [];
        
        if (data.results && data.results.utterances) {
          data.results.utterances.forEach((u: any) => {
            if (u.words && u.words.length > 0) {
              let currentStart = u.words[0].start;
              let text = '';
              for (let i = 0; i < u.words.length; i++) {
                const w = u.words[i];
                text += (w.punctuated_word || w.word) + ' ';
                // Check if this word ends in punctuation and thus finishes a sentence
                if ((w.punctuated_word || w.word).match(/[.!?]$/)) {
                  newCaptions.push({
                    text: text.trim(),
                    start: currentStart,
                    end: w.end,
                    speaker: (u.speaker || 0) + 1
                  });
                  text = '';
                  // Update start to next word if there is one
                  if (i + 1 < u.words.length) {
                    currentStart = u.words[i + 1].start;
                  }
                }
              }
              if (text.trim().length > 0) {
                newCaptions.push({
                  text: text.trim(),
                  start: currentStart,
                  end: u.words[u.words.length - 1].end,
                  speaker: (u.speaker || 0) + 1
                });
              }
            } else {
              newCaptions.push({
                text: u.transcript || u.text || '',
                start: Number(u.start) || 0,
                end: Number(u.end) || 0,
                speaker: (Number(u.speaker) || 0) + 1
              });
            }
          });
        } else if (data.results?.channels?.[0]?.alternatives?.[0]?.words) {
          const words = data.results.channels[0].alternatives[0].words;
          if (words.length > 0) {
            let currentStart = words[0].start;
            let text = '';
            for(let i = 0; i < words.length; i++) {
              const w = words[i];
              text += (w.punctuated_word || w.word) + ' ';
              if ((w.punctuated_word || w.word)?.match(/[.!?]$/)) {
                newCaptions.push({ text: text.trim(), start: currentStart, end: w.end, speaker: 1 });
                text = '';
                if (i + 1 < words.length) {
                  currentStart = words[i + 1].start;
                }
              }
            }
            if (text.trim()) newCaptions.push({ text: text.trim(), start: currentStart, end: words[words.length-1].end, speaker: 1 });
          }
        }
        
        setCaptions(newCaptions);
        try {
           localStorage.setItem(cacheKey, JSON.stringify(newCaptions));
        } catch (e) {
           console.error("Local storage error:", e);
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    };

    transcribeUrl();
  }, [audioUrl]);

  const handleAddImageElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      addElement({
        type: 'image',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 10,
        imageUrl: url,
      });
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
      }
    });
  };

  const togglePlayback = () => {
    if (!audioUrl) {
      alert("Please upload an audio file first.");
      return;
    }
    setPlaying(!playing);
  };

  const saveTemplate = () => {
    const name = prompt("Name your template:", "New Template");
    if (!name) return;

    const newTemplate: Template = {
      name,
      headline,
      subhead,
      ctaText,
      visualizerColor,
      accentColor
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('hyperframes_templates', JSON.stringify(updated));
    alert("Template saved!");
  };

  const loadTemplate = (t: Template) => {
    setHeadline(t.headline);
    setSubhead(t.subhead);
    setCtaText(t.ctaText);
    setVisualizerColor(t.visualizerColor);
    setAccentColor(t.accentColor);
  };

  const downloadSimulatedVideo = async () => {
    setRendering(true);
    setRenderProgress(0);

    const isVertical = platform === 'vertical';
    const targetWidth = 1080;
    const targetHeight = isVertical ? 1920 : 1350;
    
    // UI is based on 360px width
    const scale = targetWidth / 360;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Pre-load images to avoid flickering during recording
    const imageCache: Record<string, HTMLImageElement> = {};
    let bgVideoEl: HTMLVideoElement | null = null;
    let renderDuration = 3000; // default 3s if no audio/video

    if (bgMedia && bgMedia.type.startsWith('image')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgMedia.url;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      imageCache[bgMedia.url] = img;
    } else if (bgMedia && bgMedia.type === 'video') {
      bgVideoEl = document.createElement('video');
      bgVideoEl.crossOrigin = 'anonymous';
      bgVideoEl.src = bgMedia.url;
      bgVideoEl.volume = 0; // mute the video element so it doesn't play out loud to the user during render
      bgVideoEl.playsInline = true;
      await new Promise(r => { bgVideoEl!.onloadeddata = r; bgVideoEl!.onerror = r; });
      if (bgVideoEl.duration && isFinite(bgVideoEl.duration)) {
        renderDuration = Math.max(renderDuration, bgVideoEl.duration * 1000);
      }
    }
    const elements = useEditorStore.getState().elements;
    for (const el of elements) {
      if (el.type === 'image' && el.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = el.imageUrl;
        await new Promise(r => { img.onload = r; img.onerror = r; });
        
        if (el.removeWhite) {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const cCtx = c.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(img, 0, 0);
            const imgData = cCtx.getImageData(0, 0, c.width, c.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                data[i+3] = 0;
              }
            }
            cCtx.putImageData(imgData, 0, 0);
            const transparentImg = new Image();
            transparentImg.src = c.toDataURL('image/png');
            await new Promise(r => { transparentImg.onload = r; });
            imageCache[el.imageUrl] = transparentImg;
            continue;
          }
        }
        
        imageCache[el.imageUrl] = img;
      }
    }

    // Draw background initially
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.style.position = 'fixed';
    canvas.style.top = '-9999px';
    canvas.style.left = '-9999px';
    canvas.style.opacity = '1'; 
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    document.body.appendChild(canvas);

    const stream = canvas.captureStream(60);

    let audioContext: AudioContext | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let destStream: MediaStream | null = null;

    if (audioUrl) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        const dest = audioContext.createMediaStreamDestination();
        destStream = dest.stream;
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        renderDuration = Math.max(renderDuration, audioBuffer.duration * 1000);
        
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        
        audioSource.connect(analyser);
        analyser.connect(dest);
        
        // Critical: inject the audio track into the main video stream
        destStream.getAudioTracks().forEach(track => stream.addTrack(track));
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        console.error("Error setting up audio:", e);
      }
    }

    if (renderDurationCap !== 'full') {
      renderDuration = Math.min(renderDuration, renderDurationCap * 1000);
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      await new Promise(r => setTimeout(r, 100)); // drain remaining chunks
      const blob = new Blob(chunks, { type: 'video/webm' });
      
      const formData = new FormData();
      formData.append('video', blob, 'video.webm');
      
      try {
        const res = await fetch('/api/convert-to-mp4', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Failed to convert');
        
        const mp4Blob = await res.blob();
        if (mp4Blob.size < 100) {
           throw new Error('MP4 conversion failed, blob too small');
        }
        
        const url = URL.createObjectURL(mp4Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rendered_video_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error creating MP4:", err);
        // Fallback to WebM
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rendered_video_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setRendering(false);
      setRenderProgress(100);
    };

    mediaRecorder.start();
    if (audioSource) {
      audioSource.start();
    }
    if (bgVideoEl) {
      bgVideoEl.currentTime = 0;
      bgVideoEl.play();
    }
    
    const startTime = Date.now();
    let frame = 0;
    
    let hasStopped = false;

    const draw = () => {
      if (hasStopped) return;
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= renderDuration) {
         hasStopped = true;
         
         if (mediaRecorder.state !== 'inactive') {
            try { mediaRecorder.requestData(); } catch(e){}
            mediaRecorder.stop();
         } else {
            setRendering(false);
            setRenderProgress(100);
         }
         
         if (canvas.parentNode) {
           canvas.parentNode.removeChild(canvas);
         }
         if (audioSource) {
           try { audioSource.stop(); } catch(e){}
         }
         if (bgVideoEl) {
           bgVideoEl.pause();
         }
         if (audioContext) {
           audioContext.close();
         }
         return;
      }

      setRenderProgress(Math.min((elapsed / renderDuration) * 100, 100));
      
      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (bgMedia && bgMedia.type === 'video' && bgVideoEl) {
        // cover mode video
        const canvasRatio = canvas.width / canvas.height;
        const vidRatio = bgVideoEl.videoWidth / Math.max(1, bgVideoEl.videoHeight);
        let dWidth = canvas.width;
        let dHeight = canvas.height;
        if (vidRatio > canvasRatio) {
           dWidth = canvas.height * vidRatio;
        } else {
           dHeight = canvas.width / vidRatio;
        }
        const dx = (canvas.width - dWidth) / 2;
        const dy = (canvas.height - dHeight) / 2;
        ctx.drawImage(bgVideoEl, dx, dy, dWidth, dHeight);
      } else if (bgMedia && imageCache[bgMedia.url]) {
        // cover mode image
        const img = imageCache[bgMedia.url];
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let dWidth = canvas.width;
        let dHeight = canvas.height;
        if (imgRatio > canvasRatio) {
           dWidth = canvas.height * imgRatio;
        } else {
           dHeight = canvas.width / imgRatio;
        }
        const dx = (canvas.width - dWidth) / 2;
        const dy = (canvas.height - dHeight) / 2;
        ctx.drawImage(img, dx, dy, dWidth, dHeight);
      }
      
      const currentElements = useEditorStore.getState().elements;
      const sortedElements = [...currentElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      const currentTimeSec = elapsed / 1000;
      const storeCaptions = useEditorStore.getState().captions;
      const activeCaptionGlobal = storeCaptions.length > 0 
         ? storeCaptions.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end)
         : MOCK_CAPTIONS.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
      
      const loopSpeaker = activeCaptionGlobal ? activeCaptionGlobal.speaker : 1;
      
      if (analyser && dataArray) {
        const visEl = currentElements.find(e => e.type === 'visualizer');
        if (visEl) {
          analyser.smoothingTimeConstant = visEl.visualizerSmoothing ?? 0.8;
        }
        analyser.getByteFrequencyData(dataArray);
      }

      sortedElements.forEach(el => {
         ctx.save();
         const elX = el.x * scale;
         const elY = el.y * scale;
         const elW = (typeof el.width === 'number' ? el.width : 200) * scale;
         const elH = (typeof el.height === 'number' ? el.height : 50) * scale;
         
         ctx.translate(elX, elY);
         if (el.rotation) {
             ctx.translate(elW / 2, elH / 2);
             ctx.rotate(el.rotation * Math.PI / 180);
             ctx.translate(-elW / 2, -elH / 2);
         }
         
         if (el.type === 'image' && el.imageUrl && imageCache[el.imageUrl]) {
            if (el.mixBlendMode) {
                ctx.globalCompositeOperation = el.mixBlendMode as any;
            }
            const img = imageCache[el.imageUrl];
            const imgRatio = img.width / img.height;
            const boxRatio = elW / elH;
            
            let drawW = elW;
            let drawH = elH;
            
            if (imgRatio > boxRatio) {
                drawH = drawW / imgRatio;
            } else {
                drawW = drawH * imgRatio;
            }
            
            const drawX = (elW - drawW) / 2;
            const drawY = (elH - drawH) / 2;
            
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            
            if (el.mixBlendMode) {
                ctx.globalCompositeOperation = 'source-over';
            }
         } else if (el.type === 'text') {
             ctx.fillStyle = el.color || '#fff';
             const fontSize = (el.fontSize || 16) * scale;
             ctx.font = `${el.fontWeight || 'normal'} ${fontSize}px ${el.fontFamily || 'Inter, sans-serif'}`;
             ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
             ctx.textBaseline = 'top';
             
             const explicitLines = (el.content || '').split('\n');
             const lines: string[] = [];
             
             explicitLines.forEach(expLine => {
               if (!expLine) {
                 lines.push('');
                 return;
               }
               const words = expLine.split(/\s+/);
               let currentLine = words[0] || '';
               for (let i = 1; i < words.length; i++) {
                 const word = words[i];
                 const width = ctx.measureText(currentLine + " " + word).width;
                 if (width <= elW) {
                   currentLine += " " + word;
                 } else {
                   lines.push(currentLine);
                   currentLine = word;
                 }
               }
               if (currentLine) {
                  lines.push(currentLine);
               }
             });

             const lineHeight = fontSize * (el.lineHeight || 1.2);
             const totalHeight = lines.length * lineHeight;
             
             let textX = 0;
             if (ctx.textAlign === 'center') textX = elW / 2;
             else if (ctx.textAlign === 'right') textX = elW;
             
             // Vertically center using top baseline, shifted down slightly to match HTML visual center
             const startY = (elH - totalHeight) / 2 + (fontSize * 0.1);

             lines.forEach((line, i) => {
               ctx.fillText(line, textX, startY + (i * lineHeight), elW);
             });
         } else if (el.type === 'caption') {
             const currentTimeSec = elapsed / 1000;
             const storeCaptions = useEditorStore.getState().captions;
             const activeCaption = storeCaptions.length > 0 
                ? storeCaptions.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end)
                : MOCK_CAPTIONS.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
             
             if (activeCaption) {
                const captionFontSize = 18 * scale;
                ctx.font = `bold ${captionFontSize}px Inter, sans-serif`;
                
                const maxTextWidth = elW - (4 * scale);
                const words = `${activeCaption.text}`.split(' ');
                let line = '';
                const lines = [];
                for(let i = 0; i < words.length; i++) {
                  const testLine = line + words[i] + ' ';
                  const metrics = ctx.measureText(testLine);
                  const testWidth = metrics.width;
                  if (testWidth > maxTextWidth && i > 0) {
                    lines.push(line);
                    line = words[i] + ' ';
                  } else {
                    line = testLine;
                  }
                }
                lines.push(line);
                const renderLines = lines.slice(0, 2); 
                const lineHeight = captionFontSize * 1.3;
                
                const totalTextHeight = renderLines.length * lineHeight;
                const startY = (elH - totalTextHeight) / 2 + (captionFontSize * 0.1);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = el.color || accentColor;
                
                // Add drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 4 * scale;
                ctx.shadowOffsetX = 1 * scale;
                ctx.shadowOffsetY = 1 * scale;
                
                renderLines.forEach((l, i) => {
                  ctx.fillText(l.trim(), elW / 2, startY + (i * lineHeight));
                });
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
             }
         } else if (el.type === 'button') {
             ctx.fillStyle = el.backgroundColor || '#4f46e5';
             const r = (el.borderRadius || 8) * scale;
             ctx.beginPath();
             ctx.roundRect(0, 0, elW, elH, r);
             ctx.fill();
             
             if (el.content) {
                 ctx.fillStyle = el.color || '#fff';
                 const fontSize = (el.fontSize || 18) * scale;
                 ctx.font = `${el.fontWeight || 'bold'} ${fontSize}px sans-serif`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(el.content, elW / 2, elH / 2);
             }
         } else if (el.type === 'visualizer') {
             ctx.fillStyle = el.barColor || '#fff';
             ctx.strokeStyle = el.barColor || '#fff';
             ctx.lineWidth = 4 * scale;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             
             const type = el.visualizerType || 'bars-center';
             const count = el.barCount || 8;
             const mirror = el.visualizerMirror || false;
             const sensitivityMultiplier = el.visualizerSensitivity ?? 1.0;

             const getValue = (idx, total) => {
                 let val = 0;
                 if (analyser && dataArray) {
                     const dataBins = Math.floor(dataArray.length * 0.4);
                     const dataIdx = 1 + Math.floor((idx / Math.max(1, total - 1)) * dataBins);
                     val = Math.min((dataArray[Math.min(dataIdx, dataArray.length-1)] / 255.0) * sensitivityMultiplier, 1.0); 
                     val = Math.pow(val, 1.5); // non-linear scaling for better visuals
                 } else {
                     val = Math.min(((Math.sin(frame * 0.2 + idx) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier, 1.0);
                 }
                 return val;
             };

             const values = [];
             if (mirror) {
                 const half = Math.ceil(count / 2);
                 for(let i=0; i<half; i++) values.push(getValue(i, half));
                 for(let i=half; i<count; i++) values.push(values[count - 1 - i]);
             } else {
                 for(let i=0; i<count; i++) values.push(getValue(i, count));
             }
             
             if (el.visualizerSplitSpeakers) {
                 const halfCount = Math.floor(count / 2);
                 for (let i = 0; i < count; i++) {
                     if (loopSpeaker === 1 && i >= halfCount) values[i] = 0;
                     if (loopSpeaker === 2 && i < halfCount) values[i] = 0;
                 }
             }

             if (type === 'bars-bottom' || type === 'bars-center') {
                 const gap = 2 * scale;
                 const barW = (elW - gap * (count - 1)) / count;
                 for (let i = 0; i < count; i++) {
                     const v = values[i];
                     const minBarH = 4 * scale;
                     const barH = Math.min(minBarH + v * (elH * 0.9), elH);
                     const barX = i * (barW + gap);
                     const barY = type === 'bars-center' ? (elH - barH) / 2 : elH - barH;
                     
                     ctx.beginPath();
                     ctx.roundRect(barX, barY, barW, barH, barW / 2);
                     ctx.fill();
                 }
             } else if (['ai-orb', 'siri-wave', 'ai-blob', 'elevenlabs-v1', 'elevenlabs-v2', 'elevenlabs-v3', 'chatgpt-orb'].includes(type)) {
                 let v = 0;
                 if (analyser && dataArray) {
                     const binsCount = Math.floor(dataArray.length * 0.5);
                     if (el.visualizerSplitSpeakers) {
                         const halfCount = Math.floor(binsCount / 2);
                         for (let i = 0; i < binsCount; i++) {
                             if (loopSpeaker === 1 && i < halfCount) v += dataArray[i];
                             if (loopSpeaker === 2 && i >= halfCount) v += dataArray[i];
                         }
                         v = v / halfCount;
                     } else {
                         for (let i = 0; i < binsCount; i++) v += dataArray[i];
                         v = v / binsCount;
                     }
                     v = Math.min((v / 255.0) * sensitivityMultiplier, 1.0);
                 } else {
                     v = Math.min(((Math.sin(frame * 0.2) * 0.5 + 0.5) * 0.5) * sensitivityMultiplier, 1.0);
                 }
                 
                 drawAdvancedVisualizer(ctx, type, elW, elH, v, frame, el.barColor || '#00ffcc', scale);
             }
         }
         ctx.restore();
      });

      const videoTrack = stream.getVideoTracks()[0] as any;
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame();
      }

      frame++;
      
      if (!hasStopped) {
         requestAnimationFrame(draw);
      }
    };
    
    requestAnimationFrame(draw);
  };

  const simulateRender = () => {
    downloadSimulatedVideo();
  };

  const runBatch = () => {
    if (csvData.length === 0) {
      alert("Please upload a CSV file with batch data.");
      return;
    }
    setBatchStatus('processing');
    setRenderProgress(0);
    
    const totalItems = csvData.length;
    let currentItem = 0;

    const processNext = () => {
      if (currentItem >= totalItems) {
        setBatchStatus('done');
        return;
      }

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setRenderProgress(((currentItem * 100) + progress) / totalItems);
        
        if (progress >= 100) {
          clearInterval(interval);
          currentItem++;
          processNext();
        }
      }, 50); // fast simulation
    };

    processNext();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">H</div>
          <h1 className="text-lg font-semibold tracking-tight">
            Hyperframes <span className="text-slate-400 font-normal">AdGen Studio</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700 flex items-center gap-1.5 hidden sm:flex">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> /hyperframes skill: Active
          </div>
          <button 
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'single' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Composition
          </button>
          <button 
            onClick={async () => {
              console.log("Testing render API...");
              try {
                const res = await fetch('/api/render-test', { method: 'POST' });
                const data = await res.json();
                console.log("Render API Response:", data);
              } catch (e) {
                console.error("Render API fetch error:", e);
              }
            }}
            className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors border border-red-300"
          >
            Test Render
          </button>
          <button 
            onClick={async () => {
              console.log("Testing hyperframes render...");
              try {
                const res = await fetch('/api/hyperframes-render-test', { method: 'POST' });
                const data = await res.json();
                console.log("Hyperframes Render Response:", data);
              } catch (e) {
                console.error("Hyperframes Render API fetch error:", e);
              }
            }}
            className="px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors border border-orange-300"
          >
            Test Hyperframes Render
          </button>
          <button 
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-50 rounded-lg'}`}
          >
            Batch View
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Settings Sidebar */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 shrink-0 hidden lg:flex">
            
            {activeTab === 'single' ? (
              <>
              <PropertiesPanel 
                saveTemplate={saveTemplate}
                templates={templates}
                loadTemplate={loadTemplate}
                headline={headline} setHeadline={setHeadline}
                subhead={subhead} setSubhead={setSubhead}
                ctaText={ctaText} setCtaText={setCtaText}
              />

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Style & Assets</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Visualizer Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50">
                      <input 
                        type="color" 
                        value={visualizerColor}
                        onChange={e => setVisualizerColor(e.target.value)}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <span className="text-xs text-slate-600">{visualizerColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Accent Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50">
                      <input 
                        type="color" 
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <span className="text-xs text-slate-600">{accentColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Background Color</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50">
                      <input 
                        type="color" 
                        value={bgColor}
                        onChange={e => setBgColor(e.target.value)}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <span className="text-xs text-slate-600 uppercase">{bgColor}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={(e) => {
                          handleImageUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload background"
                      />
                      <div className="w-full h-full flex items-center justify-between px-3 py-2 text-sm border border-dashed border-slate-300 rounded-md text-slate-500 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-slate-400" />
                          Background
                        </span>
                        <span className="text-xs font-mono truncate max-w-[100px] text-right">
                          {bgMedia ? "loaded" : "none"}
                        </span>
                      </div>
                    </div>
                    {bgMedia && (
                      <button 
                        onClick={() => setBgMedia(null)}
                        title="Remove Background"
                        className="px-2 border border-slate-200 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={(e) => {
                          handleAudioUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload audio"
                      />
                      <div className="w-full h-full flex items-center justify-between px-3 py-2 text-sm border border-dashed border-slate-300 rounded-md text-slate-500 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          {isTranscribing ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
                          {isTranscribing ? "Transcribing..." : "Audio (MP3)"}
                        </span>
                        <span className="text-xs font-mono uppercase truncate max-w-[100px] text-right">
                          {audioFileName || "none"}
                        </span>
                      </div>
                    </div>
                    {audioUrl && (
                      <button 
                        onClick={() => { setAudioUrl(null); setAudioFileName(''); }}
                        title="Remove Audio"
                        className="px-2 border border-slate-200 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          handleAddImageElement(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Add Image Layer"
                      />
                      <div className="w-full h-full flex items-center justify-between px-3 py-2 text-sm border border-dashed border-slate-300 rounded-md text-slate-500 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-400" />
                          Add Image Layer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Simulator</h2>
                  <button 
                    onClick={() => setPlatformTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Toggle Theme"
                  >
                    {platformTheme === 'dark' ? <Sun className="w-4 h-4 cursor-pointer" /> : <Moon className="w-4 h-4 cursor-pointer" />}
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Environment</label>
                    <select 
                      value={platform}
                      onChange={e => setPlatform(e.target.value as PlatformType)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="vertical">Reels & Stories (9:16)</option>
                      <option value="feed">Facebook & IG Feed (4:5)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 flex items-center justify-between mt-2 mb-2 p-2 bg-slate-50 border border-slate-100 rounded-md">
                    <label className="text-xs font-semibold text-slate-700 cursor-pointer select-none" htmlFor="safeZonesToggle">Show Safe Zones</label>
                    <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" id="safeZonesToggle" checked={showSafeZones} onChange={(e) => setShowSafeZones(e.target.checked)} className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 border-slate-300 appearance-none cursor-pointer z-10 transition-transform duration-200 checked:translate-x-4 checked:border-indigo-500" style={{ top: 0, left: 0 }} />
                        <label htmlFor="safeZonesToggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors duration-200 ${showSafeZones ? 'bg-indigo-500' : 'bg-slate-300'}`}></label>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex items-center justify-between mt-2 mb-2 p-2 bg-slate-50 border border-slate-100 rounded-md">
                    <label className="text-xs font-semibold text-slate-700 cursor-pointer select-none" htmlFor="redGuidesToggle">Show Red Info Text</label>
                    <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" id="redGuidesToggle" checked={showRedGuides} onChange={(e) => setShowRedGuides(e.target.checked)} className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 border-slate-300 appearance-none cursor-pointer z-10 transition-transform duration-200 checked:translate-x-4 checked:border-indigo-500" style={{ top: 0, left: 0 }} />
                        <label htmlFor="redGuidesToggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors duration-200 ${showRedGuides ? 'bg-indigo-500' : 'bg-slate-300'}`}></label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Brand Username</label>
                    <input 
                      type="text" 
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Brand Logo</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1 group">
                         <input 
                           type="file" 
                           accept="image/*"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const url = URL.createObjectURL(file);
                               setBrandLogo(url);
                             }
                           }}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         />
                         <div className="w-full px-3 py-2 border border-slate-200 border-dashed rounded-md bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-between pointer-events-none">
                           <span className="text-sm font-medium text-slate-500">
                              Upload Logo...
                           </span>
                           <span className="text-xs font-mono uppercase truncate max-w-[80px] text-right">
                              {brandLogo ? "Uploaded" : "None"}
                           </span>
                         </div>
                       </div>
                       {brandLogo && (
                          <button 
                             onClick={() => setBrandLogo(null)}
                             title="Remove Logo"
                             className="px-2 border border-slate-200 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Auto-injected CTA</label>
                    <select 
                      value={autoCta}
                      onChange={e => setAutoCta(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Learn More">Learn More</option>
                      <option value="Get Quote">Get Quote</option>
                      <option value="Book Now">Book Now</option>
                      <option value="Shop Now">Shop Now</option>
                      <option value="Sign Up">Sign Up</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      Caption Preview
                    </label>
                    <textarea 
                      value={simulatedCaption}
                      onChange={e => setSimulatedCaption(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" 
                    />
                    <div className="flex justify-end text-[10px] text-slate-400 font-medium">
                       {simulatedCaption.length > 125 ? <span className="text-orange-500 flex items-center gap-1">⚠ Truncated (~125 chars max before 'more')</span> : `~${125 - simulatedCaption.length} chars until truncation`}
                    </div>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div className="bg-indigo-900 rounded-xl border border-indigo-800 shadow-sm p-4 text-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Batch Engine</h2>
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                
                <p className="text-[11px] leading-relaxed text-indigo-200 mb-4">
                  Upload a CSV file containing <strong>headline</strong> and <strong>audioUrl</strong> to render multiple variations.
                </p>

                <div className="relative group mb-4">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleCsvUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-indigo-500/50 hover:bg-indigo-800/50 rounded-lg p-4 bg-indigo-950/20 transition-colors">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-200">
                      Drag & Drop CSV
                    </span>
                  </div>
                </div>

                {csvData.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] leading-relaxed text-indigo-200 mb-2">
                      Current Queue: <span className="text-white font-semibold">{csvData.length} Combinations</span>
                    </p>
                    <div className="bg-indigo-950/50 rounded-lg border border-indigo-800 max-h-32 overflow-y-auto">
                      <table className="w-full text-left text-[10px]">
                        <thead className="sticky top-0 bg-indigo-900">
                          <tr>
                            <th className="px-2 py-1.5 font-medium text-indigo-300">#</th>
                            <th className="px-2 py-1.5 font-medium text-indigo-300">Headline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-800/50">
                          {csvData.map((row, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1.5 text-indigo-400">{i + 1}</td>
                              <td className="px-2 py-1.5 text-indigo-200 truncate max-w-[120px]">{row.headline || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button 
                  onClick={runBatch}
                  disabled={batchStatus === 'processing' || csvData.length === 0}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                >
                  {batchStatus === 'processing' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Batch Render {Math.round(renderProgress)}%</>
                  ) : batchStatus === 'done' ? (
                    <><CheckCircle2 className="w-4 h-4" /> Batch Complete</>
                  ) : (
                    "Initialize Batch Render"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
            
            <div className="w-full max-w-[420px] relative">
              <PlatformFrame
                platform={platform}
                theme={platformTheme}
                brandName={brandName}
                brandLogo={brandLogo}
                caption={simulatedCaption}
                metaCta={autoCta}
              >
                <CanvasEditor 
                  platform={platform}
                  backgroundColor={bgColor}
                  bgMedia={bgMedia}
                  audioUrl={audioUrl}
                  accentColor={accentColor}
                  playing={playing}
                  onPlaybackComplete={() => setPlaying(false)}
                />
              </PlatformFrame>
              
              {/* Overlay while rendering */}
              {rendering && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 rounded-[30px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-4 bg-slate-900 rounded-full shadow-2xl mb-4 border border-slate-700">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
                  <div className="text-white font-semibold mb-2">Executing Render...</div>
                  <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 max-w-[280px]">
                    <p className="text-xs text-red-300 font-semibold mb-1">⚠️ DO NOT SWITCH TABS</p>
                    <p className="text-[10px] text-red-200/80 leading-relaxed">
                      Keep this window visible and active. Switching tabs will pause the browser's render engine and freeze your video.
                    </p>
                  </div>
                </div>
              )}

              {/* Cycle Platform Button */}
              <button 
                onClick={() => {
                  const platforms: PlatformType[] = ['vertical', 'feed'];
                  const currentIndex = platforms.indexOf(platform);
                  const nextIndex = (currentIndex + 1) % platforms.length;
                  setPlatform(platforms[nextIndex]);
                }}
                className="absolute -right-14 sm:-right-20 bottom-8 p-3 bg-white border border-slate-200 shadow-xl rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all cursor-pointer group z-10"
                title="Next Environment"
              >
                <ChevronDown className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={simulateRender}
                  disabled={rendering}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700 shadow-sm disabled:opacity-50 transition-colors"
                 >
                  <Video className="w-4 h-4" />
                  Render Output
                </button>
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={downloadSimulatedVideo}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700 shadow-sm transition-colors"
                   >
                    <Download className="w-4 h-4" />
                    Download Video
                  </button>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="font-medium mr-1 text-slate-600">Video length:</span>
                    <button 
                      onClick={() => setRenderDurationCap(30)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 30 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      30s
                    </button>
                    <button 
                      onClick={() => setRenderDurationCap(60)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 60 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      60s
                    </button>
                    <button 
                      onClick={() => setRenderDurationCap('full')}
                      className={`px-1.5 py-0.5 rounded transition-colors ${renderDurationCap === 'full' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100'}`}
                    >
                      Full
                    </button>
                  </div>
                </div>
                <button 
                  onClick={togglePlayback}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors self-start"
                 >
                  {playing ? (
                    <><Square className="w-4 h-4 text-red-400" /> Stop Preview</>
                  ) : (
                    <><Play className="w-4 h-4 text-indigo-400 fill-current" /> Play Preview</>
                  )}
                </button>
              </div>
            </div>
            
          </div>

          {/* Generation Log */}
          <div className="w-64 bg-slate-900 rounded-xl overflow-hidden flex flex-col shadow-inner shrink-0 hidden xl:flex">
            <div className="p-3 bg-slate-800 border-b border-slate-700">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                Rendering Engine
                {rendering || batchStatus === 'processing' ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> : <span className="w-2 h-2 rounded-full bg-slate-500"></span>}
              </h2>
            </div>
            <div className="flex-1 p-3 font-mono text-[10px] text-green-400 space-y-1.5 overflow-hidden">
               <p>&gt; hyperframes initialize --p vertical-ad</p>
               <p>&gt; loading styles ... OK</p>
               {(rendering || batchStatus !== 'idle') && (
                 <>
                   <p>&gt; analyzing media...</p>
                   <p>&gt; found audio track</p>
                   <p>&gt; generating transcribe captions...</p>
                   {playing || rendering ? (
                     <p className="text-indigo-400 animate-pulse">&gt; building gsap timeline...</p>
                   ) : null}
                 </>
               )}
               {batchStatus === 'processing' && (
                 <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                   <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batch Progress</span>
                        <span>{Math.round(renderProgress)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${renderProgress}%` }}></div>
                      </div>
                   </div>
                 </div>
               )}
               {(rendering && renderProgress === 100) || batchStatus === 'done' ? (
                 <div className="p-2 bg-slate-800 rounded border border-slate-700 mt-4">
                    <p className="text-slate-300">Recent Outputs:</p>
                    <p onClick={downloadSimulatedVideo} className="text-indigo-400 underline cursor-pointer mt-1 flex items-center justify-between">
                       ad_output.webm <Download className="w-3 h-3" />
                    </p>
                 </div>
               ) : null}
            </div>
          </div>
        </main>
    </div>
  );
}

