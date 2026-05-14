import React, { useState, useRef, useEffect } from 'react';
import { PlatformFrame, type PlatformType } from './components/PlatformFrame';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Upload, Play, Square, Database, CheckCircle2, Download, Layers, Loader2, X, Moon, Sun, ChevronDown, Type, AudioLines, Captions, MousePointerClick, Image as ImageIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useEditorStore } from './store';
import { drawAdvancedVisualizer } from './lib/visualizer';
import { parseRichText, stripRichText, type RichTextRun } from './lib/rich-text';

const MOCK_CAPTIONS = [
  { text: "Are you missing calls?", start: 0, end: 2, speaker: 1 },
  { text: "Our AI receptionist can help.", start: 2.5, end: 4.5, speaker: 2 },
  { text: "Available 24/7.", start: 5, end: 6.5, speaker: 1 },
  { text: "Never miss a lead again.", start: 7, end: 9, speaker: 2 },
];

type RenderDurationCap = 30 | 60 | 'full';
type ExportPhase = 'recording' | 'converting' | 'complete' | 'error';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single Template State
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
  const [bgShadow, setBgShadow] = useState(true);
  const [bgShadowOpacity, setBgShadowOpacity] = useState(0.38);
  const [introImage, setIntroImage] = useState<string | null>(null);
  const [introFileName, setIntroFileName] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>('/019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
  const [audioFileName, setAudioFileName] = useState<string>('019e13bd-0b04-7dd0-95d6-dbcb36900e35-1778447713483-d2bb8e52-6c00-4439-a0e9-52f7e7a4a897-stereo (1).mp3');
  
  // Playback/Render State
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportPhase>('recording');
  const [exportDownload, setExportDownload] = useState<{ url: string; filename: string } | null>(null);
  const [exportLaunchAnimation, setExportLaunchAnimation] = useState(false);
  const [renderDurationCap, setRenderDurationCap] = useState<RenderDurationCap>(30);

  // Batch State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  const { showSafeZones, setShowSafeZones, showRedGuides, setShowRedGuides, addElement, elements } = useEditorStore();
  const hasComponent = (role: NonNullable<typeof elements[number]['componentRole']>) => elements.some((element) => element.componentRole === role);
  const hasSubheadline = hasComponent('subheadline');

  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (!rendering) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rendering]);

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

  const handleIntroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIntroImage(URL.createObjectURL(file));
    setIntroFileName(file.name);
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
        componentRole: 'image',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 10,
        imageUrl: url,
        imageShadow: false,
        imageShadowOpacity: 0.42,
      });
    }
  };

  const handleAddSubheadline = () => {
    if (hasSubheadline) return;

    addElement({
      type: 'text',
      componentRole: 'subheadline',
      content: 'Your secondary message goes here',
      x: 20,
      y: 198,
      width: 320,
      height: 72,
      rotation: 0,
      zIndex: 2,
      fontSize: 18,
      fontWeight: '600',
      color: accentColor,
      textAlign: 'center',
      lineHeight: 1.12,
    });
  };

  const handleAddHeadline = () => {
    if (hasComponent('headline')) return;
    addElement({
      type: 'text',
      componentRole: 'headline',
      content: 'YOUR HEADLINE HERE',
      x: 20,
      y: 118,
      width: 320,
      height: 120,
      rotation: 0,
      zIndex: 1,
      fontSize: 52,
      fontWeight: '900',
      color: '#000000',
      textAlign: 'center',
      lineHeight: 1.04,
    });
  };

  const handleAddVisualizer = () => {
    if (hasComponent('visualizer')) return;
    addElement({
      type: 'visualizer',
      componentRole: 'visualizer',
      x: 0,
      y: 270,
      width: 360,
      height: 120,
      rotation: 0,
      zIndex: 3,
      visualizerType: 'bars-center',
      barColor: visualizerColor,
      barCount: 16,
      visualizerSplitSpeakers: false,
    });
  };

  const handleAddCaptions = () => {
    if (hasComponent('captions')) return;
    addElement({
      type: 'caption',
      componentRole: 'captions',
      x: 20,
      y: 400,
      width: 320,
      height: 55,
      rotation: 0,
      zIndex: 4,
    });
  };

  const handleAddCta = () => {
    addElement({
      type: 'button',
      componentRole: 'cta',
      content: 'BOOK A DEMO',
      x: 88,
      y: 590,
      width: 184,
      height: 48,
      rotation: 0,
      zIndex: 5,
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      backgroundColor: accentColor,
      borderRadius: 8,
    });
  };

  const handleAddLogo = () => {
    if (hasComponent('logo')) return;
    addElement({
      type: 'image',
      componentRole: 'logo',
      imageUrl: '/logo.png',
      x: 120,
      y: 70,
      width: 120,
      height: 48,
      rotation: 0,
      zIndex: 10,
      removeWhite: true,
      imageShadow: false,
      imageShadowOpacity: 0.42,
    });
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

  const downloadSimulatedVideo = async () => {
    setExportLaunchAnimation(true);
    window.setTimeout(() => setExportLaunchAnimation(false), 650);
    setRendering(true);
    setRenderProgress(0);
    setExportPhase('recording');
    setExportDownload((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });

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

    let introImgEl: HTMLImageElement | null = null;
    if (introImage) {
      introImgEl = new Image();
      introImgEl.crossOrigin = 'anonymous';
      introImgEl.src = introImage;
      await new Promise(r => { introImgEl!.onload = r; introImgEl!.onerror = r; });
    }

    const elements = JSON.parse(JSON.stringify(useEditorStore.getState().elements));
    const captions = JSON.parse(JSON.stringify(useEditorStore.getState().captions));
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
      setExportPhase('converting');
      setRenderProgress(92);
      
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
        const filename = `rendered_video_${Date.now()}.mp4`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportDownload({ url, filename });
        setExportPhase('complete');
        setRenderProgress(100);
      } catch (err) {
        console.error("Error creating MP4:", err);
        setExportPhase('error');
        alert('MP4 export failed. Please try again.');
      }
      setRendering(false);
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

      setRenderProgress(Math.min((elapsed / renderDuration) * 90, 90));
      
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

      if (bgMedia && bgShadow) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgShadowOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      const currentElements = elements;
      const sortedElements = [...currentElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      
      const currentTimeSec = elapsed / 1000;
      const storeCaptions = captions;
      const renderCaptions = storeCaptions.length > 0 ? storeCaptions : MOCK_CAPTIONS;
      const activeCaptionIndexGlobal = renderCaptions.findIndex(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
      const activeCaptionGlobal = activeCaptionIndexGlobal >= 0 ? renderCaptions[activeCaptionIndexGlobal] : undefined;
      const hasTwoSpeakers = renderCaptions.some(c => c.speaker === 2);
      
      const loopSpeaker = activeCaptionGlobal
        ? (hasTwoSpeakers ? activeCaptionGlobal.speaker : (activeCaptionIndexGlobal % 2) + 1)
        : (Math.floor(currentTimeSec / 1.5) % 2 === 0 ? 1 : 2);
      
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

            if (el.imageShadow) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `rgba(0, 0, 0, ${el.imageShadowOpacity ?? 0.42})`;
                ctx.fillRect(0, 0, elW, elH);
            }
            
            if (el.mixBlendMode) {
                ctx.globalCompositeOperation = 'source-over';
            }
         } else if (el.type === 'text') {
             ctx.fillStyle = el.color || '#fff';
             let fontSize = (el.fontSize || 16) * scale;
             const fontFamily = el.fontFamily || 'Inter, sans-serif';
             const fontWeight = el.fontWeight || 'normal';
             const fontStyle = el.fontStyle || 'normal';
             ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
             ctx.textBaseline = 'top';
             const richRuns = parseRichText(el.content || '');
             const plainContent = stripRichText(el.content || '');

             const wrapText = (size: number) => {
               ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
               const wrapped: string[] = [];
               const explicitLines = plainContent.split('\n');
               explicitLines.forEach(expLine => {
                 if (!expLine) {
                   wrapped.push('');
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
                     wrapped.push(currentLine);
                     currentLine = word;
                   }
                 }
                 if (currentLine) wrapped.push(currentLine);
               });
               return wrapped;
             };

             let lines = wrapText(fontSize);
             let lineHeight = fontSize * (el.lineHeight || 1.12);
             if (el.type === 'text') {
               let low = 8 * scale;
               let high = 96 * scale;
               let bestSize = low;
               let bestLines = lines;
               while (low <= high) {
                 const mid = Math.floor((low + high) / 2);
                 const candidateLines = wrapText(mid);
                 const candidateHeight = candidateLines.length * mid * (el.lineHeight || 1.12);
                 const candidateWidest = candidateLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
                 if (candidateWidest <= elW - (8 * scale) && candidateHeight <= elH - (4 * scale)) {
                   bestSize = mid;
                   bestLines = candidateLines;
                   low = mid + 1;
                 } else {
                   high = mid - 1;
                 }
               }
               fontSize = bestSize;
               lines = bestLines;
               lineHeight = fontSize * (el.lineHeight || 1.12);
               ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
             } else {
               ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
             }

             const totalHeight = lines.length * lineHeight;
             
             let textX = 0;
             if (ctx.textAlign === 'center') textX = elW / 2;
             else if (ctx.textAlign === 'right') textX = elW;
             
             // Vertically center using top baseline, shifted down slightly to match HTML visual center
             const startY = (elH - totalHeight) / 2 + (fontSize * 0.1);

             lines.forEach((line, i) => {
               const lineY = startY + (i * lineHeight);
               ctx.fillText(line, textX, lineY, elW);
               if (el.textDecoration === 'underline' || richRuns.some(run => run.bold || run.italic || run.underline)) {
                 const lineRuns: RichTextRun[] = [];
                 let remaining = line.length;
                 let consumed = lines.slice(0, i).join('').length;
                 for (const run of richRuns) {
                   if (run.text === '\n') continue;
                   const runText = run.text;
                   if (consumed >= runText.length) {
                     consumed -= runText.length;
                     continue;
                   }
                   const start = Math.max(consumed, 0);
                   const slice = runText.slice(start, start + remaining);
                   if (slice) {
                     lineRuns.push({ ...run, text: slice });
                     remaining -= slice.length;
                   }
                   consumed = 0;
                   if (remaining <= 0) break;
                 }

                 if (lineRuns.some(run => run.bold || run.italic || run.underline)) {
                   ctx.clearRect(0, lineY - 2 * scale, elW, lineHeight);
                   const totalWidth = lineRuns.reduce((sum, run) => {
                     const runWeight = run.bold ? '900' : fontWeight;
                     const runStyle = run.italic ? 'italic' : fontStyle;
                     ctx.font = `${runStyle} ${runWeight} ${fontSize}px ${fontFamily}`;
                     return sum + ctx.measureText(run.text).width;
                   }, 0);
                   let cursorX = ctx.textAlign === 'center' ? (elW - totalWidth) / 2 : ctx.textAlign === 'right' ? elW - totalWidth : 0;
                   lineRuns.forEach(run => {
                     const runWeight = run.bold ? '900' : fontWeight;
                     const runStyle = run.italic ? 'italic' : fontStyle;
                     ctx.font = `${runStyle} ${runWeight} ${fontSize}px ${fontFamily}`;
                     ctx.fillText(run.text, cursorX, lineY);
                     const runWidth = ctx.measureText(run.text).width;
                     if (run.underline || el.textDecoration === 'underline') {
                       const underlineY = lineY + fontSize * 0.9;
                       ctx.save();
                       ctx.strokeStyle = el.color || '#fff';
                       ctx.lineWidth = Math.max(1.5 * scale, fontSize * 0.06);
                       ctx.beginPath();
                       ctx.moveTo(cursorX, underlineY);
                       ctx.lineTo(cursorX + runWidth, underlineY);
                       ctx.stroke();
                       ctx.restore();
                     }
                     cursorX += runWidth;
                   });
                   ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                   return;
                 }
               }
               if (el.textDecoration === 'underline') {
                 const metrics = ctx.measureText(line);
                 let underlineX = textX;
                 if (ctx.textAlign === 'center') underlineX = textX - (metrics.width / 2);
                 else if (ctx.textAlign === 'right') underlineX = textX - metrics.width;
                 const underlineY = lineY + fontSize * 0.9;
                 ctx.save();
                 ctx.strokeStyle = el.color || '#fff';
                 ctx.lineWidth = Math.max(1.5 * scale, fontSize * 0.06);
                 ctx.beginPath();
                 ctx.moveTo(underlineX, underlineY);
                 ctx.lineTo(underlineX + metrics.width, underlineY);
                 ctx.stroke();
                 ctx.restore();
               }
             });
         } else if (el.type === 'caption') {
             const currentTimeSec = elapsed / 1000;
             const storeCaptions = captions;
             const activeCaption = storeCaptions.length > 0 
                ? storeCaptions.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end)
                : MOCK_CAPTIONS.find(c => currentTimeSec >= c.start && currentTimeSec <= c.end);
             
             if (activeCaption) {
                const maxTextWidth = elW - (18 * scale);
                const maxTextHeight = elH - (16 * scale);
                const captionText = `${activeCaption.text}`;
                const fontFamily = el.fontFamily || 'Inter, sans-serif';
                const fontWeight = el.fontWeight || 'bold';
                const wrapCaptionLines = (fontSize: number) => {
                  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                  const lines: string[] = [];
                  captionText.split('\n').forEach((explicitLine) => {
                    const words = explicitLine.trim().split(/\s+/).filter(Boolean);
                    if (words.length === 0) {
                      lines.push('');
                      return;
                    }

                    let line = words[0];
                    for (let i = 1; i < words.length; i++) {
                      const testLine = `${line} ${words[i]}`;
                      if (ctx.measureText(testLine).width <= maxTextWidth) {
                        line = testLine;
                      } else {
                        lines.push(line);
                        line = words[i];
                      }
                    }
                    lines.push(line);
                  });
                  return lines;
                };

                let low = 8 * scale;
                let high = 72 * scale;
                let captionFontSize = low;
                let renderLines = wrapCaptionLines(captionFontSize);
                while (low <= high) {
                  const mid = Math.floor((low + high) / 2);
                  const candidateLines = wrapCaptionLines(mid);
                  const candidateLineHeight = mid * 1.22;
                  const widest = candidateLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
                  const totalHeight = candidateLines.length * candidateLineHeight;

                  if (widest <= maxTextWidth && totalHeight <= maxTextHeight) {
                    captionFontSize = mid;
                    renderLines = candidateLines;
                    low = mid + 1;
                  } else {
                    high = mid - 1;
                  }
                }

                ctx.font = `${fontWeight} ${captionFontSize}px ${fontFamily}`;
                const lineHeight = captionFontSize * 1.22;
                
                const totalTextHeight = renderLines.length * lineHeight;
                const startY = (elH - totalTextHeight) / 2;

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
                     const isLeftSpeakerSide = i < halfCount;
                     const isActiveSpeakerSide = !loopSpeaker || (loopSpeaker === 1 ? isLeftSpeakerSide : !isLeftSpeakerSide);
                     if (!isActiveSpeakerSide) values[i] = 0.04;
                 }
             }

             if (type === 'bars-bottom' || type === 'bars-center') {
                 const gap = 2 * scale;
                 const barW = (elW - gap * (count - 1)) / count;
                 const halfCount = Math.floor(count / 2);
                 for (let i = 0; i < count; i++) {
                     const v = values[i];
                     const minBarH = 4 * scale;
                     const barH = Math.min(minBarH + v * (elH * 0.9), elH);
                     const barX = i * (barW + gap);
                     const barY = type === 'bars-center' ? (elH - barH) / 2 : elH - barH;
                     const isLeftSpeakerSide = i < halfCount;
                     const isActiveSpeakerSide = !el.visualizerSplitSpeakers || !loopSpeaker || (loopSpeaker === 1 ? isLeftSpeakerSide : !isLeftSpeakerSide);
                     ctx.fillStyle = el.visualizerSplitSpeakers && !isLeftSpeakerSide ? '#8b5cf6' : (el.barColor || '#fff');
                     ctx.globalAlpha = isActiveSpeakerSide ? 1 : 0.28;
                     
                     ctx.beginPath();
                     ctx.roundRect(barX, barY, barW, barH, barW / 2);
                     ctx.fill();
                     ctx.globalAlpha = 1;
                 }
             } else if (['ai-orb', 'siri-wave', 'ai-blob', 'elevenlabs-v1', 'elevenlabs-v2', 'elevenlabs-v3', 'chatgpt-orb'].includes(type)) {
                 let v = 0;
                 if (analyser && dataArray) {
                     const binsCount = Math.floor(dataArray.length * 0.5);
                     if (el.visualizerSplitSpeakers) {
                         const halfCount = Math.floor(binsCount / 2);
                         for (let i = 0; i < binsCount; i++) {
                             if (!loopSpeaker || (loopSpeaker === 1 && i < halfCount) || (loopSpeaker === 2 && i >= halfCount)) v += dataArray[i];
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

      if (introImgEl) {
        const introDuration = 2;
        const introFadeDuration = 0.65;
        let introOpacity = 0;
        if (currentTimeSec < introDuration) {
          introOpacity = 1;
        } else if (currentTimeSec < introDuration + introFadeDuration) {
          introOpacity = 1 - ((currentTimeSec - introDuration) / introFadeDuration);
        }

        if (introOpacity > 0) {
          const imgRatio = introImgEl.width / introImgEl.height;
          const canvasRatio = canvas.width / canvas.height;
          let dWidth = canvas.width;
          let dHeight = canvas.height;
          if (imgRatio > canvasRatio) {
            dWidth = canvas.height * imgRatio;
          } else {
            dHeight = canvas.width / imgRatio;
          }
          const dx = (canvas.width - dWidth) / 2;
          const dy = (canvas.height - dHeight) / 2;
          ctx.save();
          ctx.globalAlpha = introOpacity;
          ctx.drawImage(introImgEl, dx, dy, dWidth, dHeight);
          ctx.restore();
        }
      }

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
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold">V</div>
          <h1 className="text-lg font-semibold tracking-tight">
            Visualizer Ads <span className="text-slate-400 font-normal">Studio</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'single' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Create Ad
          </button>
          <button 
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-50 rounded-lg'}`}
          >
            Batch Ads
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Settings Sidebar */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 shrink-0 hidden lg:flex">
            
            {activeTab === 'single' ? (
              <>
              <PropertiesPanel />

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Components</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Headline', description: 'Hook slot with refresh', icon: Type, action: handleAddHeadline, added: hasComponent('headline') },
                    { label: 'Sub-headline', description: 'Optional supporting copy', icon: Type, action: handleAddSubheadline, added: hasSubheadline },
                    { label: 'Visualizer', description: 'Audio-reactive bars', icon: AudioLines, action: handleAddVisualizer, added: hasComponent('visualizer') },
                    { label: 'Captions', description: 'Timed transcript text', icon: Captions, action: handleAddCaptions, added: hasComponent('captions') },
                    { label: 'CTA Button', description: 'Clickable-style call to action', icon: MousePointerClick, action: handleAddCta, added: false },
                    { label: 'Logo', description: 'Default brand mark', icon: ImageIcon, action: handleAddLogo, added: hasComponent('logo') },
                  ].map((component) => {
                    const Icon = component.icon;
                    return (
                      <button
                        key={component.label}
                        type="button"
                        onClick={component.action}
                        disabled={component.added}
                        className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">{component.label}</span>
                            <span className="block text-xs text-slate-500">{component.description}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">{component.added ? 'Added' : 'Add'}</span>
                      </button>
                    );
                  })}
                  <div className="relative group">
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
                    <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-left transition-colors group-hover:bg-slate-50">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">Image Layer</span>
                          <span className="block text-xs text-slate-500">Upload product or proof image</span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Upload</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Style & Assets</h2>
                <div className="space-y-2">
                  {[
                    { label: 'Visualizer', value: visualizerColor, onChange: setVisualizerColor },
                    { label: 'Accent', value: accentColor, onChange: setAccentColor },
                    { label: 'Background', value: bgColor, onChange: setBgColor },
                  ].map((colorControl) => (
                    <label
                      key={colorControl.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm font-semibold text-slate-700">{colorControl.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="relative h-7 w-7 overflow-hidden rounded border border-slate-200 shadow-inner">
                          <span
                            className="absolute inset-0"
                            style={{ backgroundColor: colorControl.value }}
                          />
                          <input
                            type="color"
                            value={colorControl.value}
                            onChange={(event) => colorControl.onChange(event.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            aria-label={`${colorControl.label} color`}
                          />
                        </span>
                        <span className="w-[68px] text-right font-mono text-xs uppercase text-slate-500">{colorControl.value}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
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
                      <div className="w-full h-full flex items-center justify-between px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>
                            <span className="block font-semibold text-slate-700">Background media</span>
                            <span className="block text-xs text-slate-500">Image or video</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {bgMedia ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {bgMedia && (
                      <button 
                        onClick={() => setBgMedia(null)}
                        title="Remove Background"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {bgMedia && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <label className="flex cursor-pointer items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-semibold text-slate-700">Shadow overlay</span>
                          <span className="block text-xs text-slate-500">Darken media behind the ad text</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={bgShadow}
                          onChange={(e) => setBgShadow(e.target.checked)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </label>
                      <div className={bgShadow ? 'mt-3 space-y-1.5' : 'mt-3 space-y-1.5 opacity-40'}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600">Intensity</label>
                          <span className="text-xs font-semibold text-slate-500">{Math.round(bgShadowOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.75"
                          step="0.05"
                          value={bgShadowOpacity}
                          disabled={!bgShadow}
                          onChange={(e) => setBgShadowOpacity(parseFloat(e.target.value))}
                          className="w-full cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleIntroImageUpload(e);
                          if(e.target) e.target.value = '';
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload intro image"
                      />
                      <div className="w-full h-full flex items-center justify-between px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex min-w-0 items-center gap-2">
                          <ImageIcon className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-700">Intro image</span>
                            <span className="block truncate text-xs text-slate-500">{introImage ? introFileName || 'Shows first 2 seconds' : 'First 2 seconds, then fades out'}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {introImage ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {introImage && (
                      <button
                        onClick={() => {
                          setIntroImage(null);
                          setIntroFileName('');
                        }}
                        title="Remove intro image"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
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
                      <div className="w-full h-full flex items-center justify-between px-3 py-3 text-sm border border-dashed border-slate-300 rounded-lg text-slate-600 group-hover:bg-slate-50 bg-white transition-colors">
                        <span className="flex items-center gap-2">
                          {isTranscribing ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Upload className="w-4 h-4 text-slate-400" />}
                          <span>
                            <span className="block font-semibold text-slate-700">{isTranscribing ? "Transcribing..." : "Voiceover audio"}</span>
                            <span className="block max-w-[170px] truncate text-xs text-slate-500">{audioFileName || "MP3, WAV, M4A"}</span>
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {audioUrl ? "Loaded" : "Upload"}
                        </span>
                      </div>
                    </div>
                    {audioUrl && (
                      <button 
                        onClick={() => { setAudioUrl(null); setAudioFileName(''); }}
                        title="Remove Audio"
                        className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Simulator</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meta preview</span>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatform('vertical')}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${platform === 'vertical' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <span className="block text-sm font-semibold">Reels</span>
                      <span className={`block text-xs ${platform === 'vertical' ? 'text-white/70' : 'text-slate-500'}`}>9:16</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatform('feed')}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${platform === 'feed' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <span className="block text-sm font-semibold">Feed</span>
                      <span className={`block text-xs ${platform === 'feed' ? 'text-white/70' : 'text-slate-500'}`}>4:5</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('dark')}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${platformTheme === 'dark' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatformTheme('light')}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${platformTheme === 'light' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'safeZonesToggle', label: 'Safe zones', checked: showSafeZones, onChange: setShowSafeZones },
                      { id: 'redGuidesToggle', label: 'Info labels', checked: showRedGuides, onChange: setShowRedGuides },
                    ].map((toggle) => (
                      <label key={toggle.id} htmlFor={toggle.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-sm font-semibold text-slate-700">{toggle.label}</span>
                        <span className="relative inline-block h-5 w-9">
                          <input
                            type="checkbox"
                            id={toggle.id}
                            checked={toggle.checked}
                            onChange={(event) => toggle.onChange(event.target.checked)}
                            className="peer sr-only"
                          />
                          <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-slate-900" />
                          <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700">Brand username</span>
                      <input 
                        type="text" 
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20" 
                      />
                    </label>

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
                         <div className="w-full px-3 py-3 border border-slate-200 border-dashed rounded-lg bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-between pointer-events-none">
                           <span>
                              <span className="block text-sm font-semibold text-slate-700">Brand logo</span>
                              <span className="block text-xs text-slate-500">Profile avatar</span>
                           </span>
                           <span className="text-xs font-semibold text-slate-400">
                              {brandLogo ? "Uploaded" : "Upload"}
                           </span>
                         </div>
                       </div>
                       {brandLogo && (
                          <button 
                             onClick={() => setBrandLogo(null)}
                             title="Remove Logo"
                             className="px-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors bg-white flex items-center justify-center shrink-0"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Platform CTA</label>
                    <select 
                      value={autoCta}
                      onChange={e => setAutoCta(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
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
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20 resize-none" 
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
                  bgShadow={bgShadow}
                  bgShadowOpacity={bgShadowOpacity}
                  introImage={introImage}
                  audioUrl={audioUrl}
                  accentColor={accentColor}
                  playing={playing}
                  onPlaybackComplete={() => setPlaying(false)}
                />
              </PlatformFrame>
              
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
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={downloadSimulatedVideo}
                    disabled={rendering}
                    className={`px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold flex items-center gap-2 text-slate-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${exportLaunchAnimation ? 'translate-y-8 scale-90 opacity-0' : ''}`}
                   >
                    {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {rendering ? 'Exporting MP4' : 'Export MP4'}
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
               {batchStatus === 'done' ? (
                 <div className="p-2 bg-slate-800 rounded border border-slate-700 mt-4">
                    <p className="text-slate-300">Recent Outputs:</p>
                    <p className="text-indigo-400 mt-1 flex items-center justify-between">
                       Batch complete <CheckCircle2 className="w-3 h-3" />
                    </p>
                 </div>
               ) : null}
            </div>
          </div>
        </main>

        {(rendering || exportDownload || exportPhase === 'error') && (
          <div className="fixed bottom-5 right-5 z-50 w-[300px] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-indigo-50 p-2">
                {exportDownload ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : exportPhase === 'error' ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {exportDownload
                      ? 'MP4 ready'
                      : exportPhase === 'error'
                        ? 'Export failed'
                        : exportPhase === 'converting'
                          ? 'Converting to MP4'
                          : 'Rendering frames'}
                  </p>
                  {exportDownload || exportPhase === 'error' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (exportDownload) URL.revokeObjectURL(exportDownload.url);
                        setExportDownload(null);
                        setExportPhase('recording');
                      }}
                      className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Dismiss export status"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">{Math.round(renderProgress)}%</span>
                  )}
                </div>
                {!exportDownload && exportPhase !== 'error' && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-indigo-500 transition-all duration-200 ${exportPhase === 'converting' ? 'animate-pulse' : ''}`}
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>}
                <p className="mt-2 text-xs leading-snug text-slate-500">
                  {exportDownload
                    ? 'Your export used a snapshot of the ad from when you clicked Export.'
                    : exportPhase === 'error'
                      ? 'Try exporting again. If it repeats, restart the dev server.'
                      : exportPhase === 'converting'
                    ? 'Finalizing the 60fps MP4. Keep this tab open.'
                    : 'Rendering a snapshot of this ad. You can start a different creative while this finishes.'}
                </p>
                {exportDownload && (
                  <a
                    href={exportDownload.url}
                    download={exportDownload.filename}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Download MP4
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
