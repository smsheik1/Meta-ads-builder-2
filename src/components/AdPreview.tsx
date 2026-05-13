import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useEditorStore } from '../store';

interface AdPreviewProps {
  headline: string;
  subhead: string;
  ctaText: string;
  backgroundImage: string | null;
  audioUrl: string | null;
  visualizerColor: string;
  accentColor: string;
  playing: boolean;
  onPlaybackComplete?: () => void;
}

const MOCK_CAPTIONS = [
  { text: "Are you missing calls?", start: 0, end: 2, speaker: 1 },
  { text: "Our AI receptionist can help.", start: 2.5, end: 4.5, speaker: 2 },
  { text: "Available 24/7.", start: 5, end: 6.5, speaker: 1 },
  { text: "Never miss a lead again.", start: 7, end: 9, speaker: 2 },
];

export const AdPreview: React.FC<AdPreviewProps> = ({
  headline,
  subhead,
  ctaText,
  backgroundImage,
  audioUrl,
  visualizerColor,
  accentColor,
  playing,
  onPlaybackComplete,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(1);

  // Setup Web Audio API and Animations
  useEffect(() => {
    if (!audioUrl) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64; // Small size for fewer bars
    }

    if (audioRef.current && !sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current.destination);
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (playing) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioRef.current.play().catch(console.error);
      animateVisualizer();
    } else {
      audioRef.current.pause();
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
      // Reset bars when paused
      barsRef.current.forEach(bar => {
        if (bar) {
          gsap.to(bar, { height: 4, duration: 0.2 });
        }
      });
    }

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [playing]);

  const animateVisualizer = () => {
    if (!analyserRef.current || !playing) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const loop = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          // Map index to a frequency bin index (skipping first few low frequencies for better visual)
          const dataIndex = Math.min(index + 2, bufferLength - 1);
          const value = dataArray[dataIndex];
          
          // Map audio value (0-255) to height (4px - 100px)
          const targetHeight = 4 + (value / 255) * 120;
          
          gsap.to(bar, {
            height: targetHeight,
            duration: 0.1,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      });

      // Handle captions simulation
      const currentTime = audioRef.current?.currentTime || 0;
      const storeCaptions = useEditorStore.getState().captions;
      const activeCaps = storeCaptions.length > 0 ? storeCaptions : MOCK_CAPTIONS;
      const activeCaption = activeCaps.find(c => currentTime >= c.start && currentTime <= c.end);
      if (activeCaption) {
        setCurrentCaption(activeCaption.text);
        setCurrentSpeaker(activeCaption.speaker);
      } else {
        setCurrentCaption(null);
      }
      
      reqAnimRef.current = requestAnimationFrame(loop);
    };
    
    loop();
  };

  const setBarRef = (el: HTMLDivElement | null, index: number) => {
    barsRef.current[index] = el;
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col items-center justify-between pointer-events-none">
      {/* Background Image Layer */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 z-0" 
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0 pointer-events-none" />

      {/* Audio Element (Hidden) */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={onPlaybackComplete}
          crossOrigin="anonymous"
        />
      )}

      {/* Internal Padding Wrapper mirroring design's p-10 */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-10 text-center z-10">
        
        {/* Copy Section (Top) */}
        <div className="w-full space-y-4">
          <h3 className="text-white text-3xl font-bold leading-tight drop-shadow-lg tracking-tight uppercase">
            {headline || "YOUR HEADLINE HERE"}
          </h3>
          <p className="text-indigo-300 text-lg font-medium tracking-wide drop-shadow-md">
            {subhead || "Your secondary message goes here"}
          </p>
        </div>

        {/* Visualizer Section (Middle) */}
        <div className="flex items-center justify-center gap-1.5 h-32 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              ref={el => setBarRef(el, i)}
              className="w-2 rounded-full"
              style={{ backgroundColor: visualizerColor, height: '8px' }}
            />
          ))}
        </div>

        {/* Bottom Section (Captions & CTA) */}
        <div className="w-full space-y-6">
          {/* Captions */}
          <div className="h-24 w-full flex items-center justify-center">
            {currentCaption ? (
              <div 
                className="w-full bg-black/40 backdrop-blur-md rounded-lg p-3 border border-white/10 text-left shadow-lg overflow-hidden flex flex-col justify-end"
                style={{ borderLeft: `4px solid ${currentSpeaker === 1 ? accentColor : '#fff'}` }}
              >
                <p className="text-[10px] uppercase font-bold mb-1 tracking-widest" style={{ color: currentSpeaker === 1 ? accentColor : '#fff' }}>
                  Speaker {currentSpeaker}
                </p>
                <p className="text-white text-sm leading-snug font-medium line-clamp-2">
                  "{currentCaption}"
                </p>
              </div>
            ) : (
              <div className="w-full bg-black/20 backdrop-blur-md rounded-lg p-3 border border-white/5 text-center flex items-center justify-center h-full">
                <span className="text-white/30 italic text-sm">
                  {audioUrl ? "Captions will appear during playback" : "Upload audio for captions"}
                </span>
              </div>
            )}
          </div>

          {/* CTA Section */}
          <button
            className="w-full py-4 rounded-full text-white font-bold text-lg uppercase tracking-widest shadow-xl border border-white/20 transition-transform transform hover:scale-105 active:scale-95 pointer-events-auto"
            style={{ backgroundColor: accentColor }}
          >
            {ctaText || "CALL TO ACTION"}
          </button>
        </div>

      </div>
    </div>
  );
};
