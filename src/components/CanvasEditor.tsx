import React, { useRef, useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import Selecto from 'react-selecto';
import { useEditorStore } from '../store';
import gsap from 'gsap';
import { Image as ImageIcon } from 'lucide-react';
import { drawAdvancedVisualizer } from '../lib/visualizer';
import { HeadlineSlot } from './HeadlineSlot';

const TransparentImage = ({ src, className, removeWhite }: { src: string, className: string, removeWhite?: boolean }) => {
  const [dataUrl, setDataUrl] = useState(src);

  useEffect(() => {
    if (!removeWhite) {
      setDataUrl(src);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // remove pure white or near white
          if (r > 240 && g > 240 && b > 240) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setDataUrl(c.toDataURL('image/png'));
      } catch (e) {
        console.error('Failed to remove white background (CORS issue?)', e);
        setDataUrl(src);
      }
    };
    img.src = src;
  }, [src, removeWhite]);

  return <img src={dataUrl} className={className} draggable={false} alt="image layer" />;
};

interface CanvasEditorProps {
  platform: 'vertical' | 'feed';
  audioUrl: string | null;
  playing: boolean;
  onPlaybackComplete?: () => void;
  accentColor: string;
  backgroundColor: string;
  bgMedia: {url: string, type: string} | null;
}

const MOCK_CAPTIONS = [
  { text: "Are you missing calls?", start: 0, end: 2, speaker: 1 },
  { text: "Our AI receptionist can help.", start: 2.5, end: 4.5, speaker: 2 },
  { text: "Available 24/7.", start: 5, end: 6.5, speaker: 1 },
  { text: "Never miss a lead again.", start: 7, end: 9, speaker: 2 },
];

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ platform, audioUrl, playing, onPlaybackComplete, accentColor, backgroundColor, bgMedia }) => {
  const { elements, selectedIds, selectElement, deselectAll, updateElement, commitHistory, showSafeZones, showRedGuides, captions } = useEditorStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  
  const [targets, setTargets] = useState<Array<HTMLElement | SVGElement>>([]);

  // Sync targets with selectedIds
  useEffect(() => {
    const newTargets = selectedIds.map(id => document.getElementById(`el-${id}`)).filter(Boolean) as HTMLElement[];
    setTargets(newTargets);
  }, [selectedIds, elements.length]); // depend on elements.length to re-attach when elements are added/removed

  // Keyboard shortcuts for z-index, undo/redo, nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      // Cmd + Z / Cmd + Shift + Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
        e.preventDefault();
        return;
      }
      
      // Z-Order: Cmd + ] or Cmd + [
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === ']') {
          if (selectedIds.length === 1) useEditorStore.getState().bringForward(selectedIds[0]);
          e.preventDefault();
          return;
        }
        if (e.key === '[') {
          if (selectedIds.length === 1) useEditorStore.getState().sendBackward(selectedIds[0]);
          e.preventDefault();
          return;
        }
      }

      // Nudging with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let dx = 0; let dy = 0;
        if (e.key === 'ArrowUp') dy = -amount;
        if (e.key === 'ArrowDown') dy = amount;
        if (e.key === 'ArrowLeft') dx = -amount;
        if (e.key === 'ArrowRight') dx = amount;
        
        selectedIds.forEach(id => {
          const el = useEditorStore.getState().elements.find(el => el.id === id);
          if (el) {
            updateElement(id, { x: el.x + dx, y: el.y + dy });
          }
        });
        commitHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  // Audio / Visualizer logic
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const barsRef = useRef<{ [id: string]: (HTMLDivElement | null)[] }>({});

  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; 
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
      Object.keys(barsRef.current).forEach((vId) => {
        barsRef.current[vId].forEach(bar => {
          if (bar) gsap.to(bar, { height: 4, duration: 0.2 });
        });
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
    let frameCount = 0;
    
    const loop = () => {
      frameCount++;
      const state = useEditorStore.getState();
      
      const currentTime = audioRef.current?.currentTime || 0;
      const activeCaps = state.captions.length > 0 ? state.captions : MOCK_CAPTIONS;
      const activeCaption = activeCaps.find(c => currentTime >= c.start && currentTime <= c.end);
      let loopSpeaker = 1;
      
      if (activeCaption) {
        setCurrentCaption(activeCaption.text);
        setCurrentSpeaker(activeCaption.speaker);
        loopSpeaker = activeCaption.speaker;
      } else {
        setCurrentCaption(null);
      }
      
      const firstVis = state.elements.find(e => e.type === 'visualizer');
      // Update smoothing parameter from the element before fetching FFT data
      if (firstVis && analyserRef.current) {
        analyserRef.current.smoothingTimeConstant = firstVis.visualizerSmoothing ?? 0.8;
      }
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      Object.keys(barsRef.current).forEach((vId) => {
        const el = state.elements.find(e => e.id === vId);
        if (!el) return;
        const type = el.visualizerType || 'bars-center';

        const sensitivityMultiplier = el.visualizerSensitivity ?? 1.0;

        if (['ai-orb', 'siri-wave', 'ai-blob', 'elevenlabs-v1', 'elevenlabs-v2', 'elevenlabs-v3', 'chatgpt-orb'].includes(type)) {
          const canvas = barsRef.current[vId][0] as unknown as HTMLCanvasElement;
          if (canvas && canvas.getContext) {
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                     canvas.width = canvas.clientWidth;
                     canvas.height = canvas.clientHeight;
                 }
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
                 
                 let value = 0;
                 const binsCount = Math.floor(bufferLength * 0.5);
                 if (el.visualizerSplitSpeakers) {
                     const halfCount = Math.floor(binsCount / 2);
                     for (let i = 0; i < binsCount; i++) {
                         if (loopSpeaker === 1 && i < halfCount) value += dataArray[i];
                         if (loopSpeaker === 2 && i >= halfCount) value += dataArray[i];
                     }
                     value = value / halfCount;
                 } else {
                     for (let i = 0; i < binsCount; i++) value += dataArray[i];
                     value = value / binsCount;
                 }
                 
                 value = (value / 255) * sensitivityMultiplier;
                 value = Math.min(value, 1.0);
                 
                 drawAdvancedVisualizer(ctx, type, canvas.width, canvas.height, value, frameCount, el.barColor || '#00ffcc');
             }
          }
        } else {
          const halfCount = Math.floor(barsRef.current[vId].length / 2);
          
          barsRef.current[vId].forEach((bar, index) => {
            if (bar) {
              const dataBins = Math.floor(bufferLength * 0.4); // Focus on lower/mid frequencies
              // Space out the indices so it looks good visually
              const dataIndex = 1 + Math.floor((index / Math.max(1, barsRef.current[vId].length - 1)) * dataBins);
              let value = (dataArray[Math.min(dataIndex, bufferLength - 1)] / 255) * sensitivityMultiplier;
              value = Math.min(value, 1.0);
              
              if (el.visualizerSplitSpeakers) {
                if (loopSpeaker === 1 && index >= halfCount) value = 0;
                if (loopSpeaker === 2 && index < halfCount) value = 0;
              }
              
              const targetHeight = 4 + Math.pow(value, 1.5) * ((bar.parentElement?.clientHeight || 100) * 0.9);
              
              gsap.to(bar, {
                height: targetHeight,
                duration: 0.1,
                ease: "power2.out",
                overwrite: "auto",
              });
            }
          });
        }
      });
      
      reqAnimRef.current = requestAnimationFrame(loop);
    };
    
    loop();
  };

  const setBarRef = (vId: string, el: HTMLDivElement | null, index: number, total: number) => {
    if (!barsRef.current[vId] || barsRef.current[vId].length !== total) {
      barsRef.current[vId] = new Array(total).fill(null);
    }
    barsRef.current[vId][index] = el;
  };

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (canvasRef.current) {
      setDimensions({ w: canvasRef.current.offsetWidth, h: canvasRef.current.offsetHeight });
    }
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [canvasRef.current]);

  const vGuidelines = dimensions.w > 0 ? [
    dimensions.w / 2, 
    0, 
    dimensions.w,
    showSafeZones ? dimensions.w * 0.06 : -1,
    showSafeZones ? dimensions.w * 0.94 : -1
  ].filter(v => v >= 0) : [];
  const hGuidelines = dimensions.h > 0 ? [
    dimensions.h / 2, 
    0, 
    dimensions.h, 
    showSafeZones ? dimensions.h * 0.14 : -1,
    showSafeZones ? dimensions.h * 0.65 : -1
  ].filter(v => v >= 0) : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if we are typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        selectedIds.forEach(id => {
          useEditorStore.getState().removeElement(id);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  return (
    <div 
      className="absolute inset-0 pointer-events-auto overflow-hidden" 
      style={{ backgroundColor }}
      ref={canvasRef}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {bgMedia && bgMedia.type === 'image' && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 z-0 pointer-events-none" 
          style={{ backgroundImage: `url(${bgMedia.url})` }}
        />
      )}
      
      {bgMedia && bgMedia.type === 'video' && (
        <video 
          src={bgMedia.url} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 z-0 pointer-events-none"
          autoPlay 
          loop 
          muted 
          playsInline
        />
      )}

      <audio 
        ref={audioRef} 
        src={audioUrl || undefined}
        onEnded={onPlaybackComplete}
      />

      {showRedGuides && platform === 'vertical' && (
         <>
           <div className="absolute top-0 left-0 right-0 h-[14%] border-b-2 border-red-500/50 border-dashed pointer-events-none z-10 flex items-end justify-center pb-2 bg-red-500/5">
             <span className="text-[10px] font-bold text-red-500/70 uppercase text-center px-4">Avoid placing content here &mdash; covered by platform UI</span>
           </div>
           <div className="absolute top-[65%] bottom-0 left-0 right-0 border-t-2 border-red-500/50 border-dashed pointer-events-none z-10 flex items-start justify-center pt-2 bg-red-500/5">
             <span className="text-[10px] font-bold text-red-500/70 uppercase text-center px-4">Avoid placing content here &mdash; covered by platform UI</span>
           </div>
         </>
      )}

      <Selecto
        dragContainer={canvasRef.current as any}
        selectableTargets={['.element-node']}
        hitRate={0}
        selectByClick={true}
        selectFromInside={false}
        toggleContinueSelect={['shift']}
        dragCondition={(e: any) => {
          const target = e.inputEvent.target;
          return !target.closest('.element-node') && !target.closest('.moveable-control-box');
        }}
        onSelectEnd={e => {
          const ids = e.selected.map(el => el.id.replace('el-', ''));
          useEditorStore.setState({ selectedIds: ids });
        }}
      />

      <Moveable
        ref={moveableRef}
        target={targets}
        draggable={true}
        resizable={true}
        rotatable={true}
        snappable={true}
        snapThreshold={5}
        isDisplaySnapDigit={true}
        snapGap={true}
        elementGuidelines={Array.from(document.querySelectorAll('.element-node'))}
        verticalGuidelines={vGuidelines}
        horizontalGuidelines={hGuidelines}
        throttleRotate={15}
        rotationPosition="top"
        
        onDragStart={e => {
            e.set([parseFloat(e.target.style.left || "0"), parseFloat(e.target.style.top || "0")]);
        }}
        onDrag={e => {
            e.target.style.left = `${e.beforeTranslate[0]}px`;
            e.target.style.top = `${e.beforeTranslate[1]}px`;
        }}
        onDragEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                updateElement(id, {
                    x: parseFloat(e.target.style.left || '0'),
                    y: parseFloat(e.target.style.top || '0')
                });
                commitHistory();
            }
        }}
        
        onDragGroupStart={e => {
            e.events.forEach(ev => {
                ev.set([parseFloat(ev.target.style.left || "0"), parseFloat(ev.target.style.top || "0")]);
            });
        }}
        onDragGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.left = `${ev.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.beforeTranslate[1]}px`;
            });
        }}
        onDragGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    updateElement(id, {
                        x: parseFloat(target.style.left || '0'),
                        y: parseFloat(target.style.top || '0')
                    });
                });
                commitHistory();
            }
        }}

        onResizeStart={e => {
            e.setOrigin(["%", "%"]);
            e.dragStart && e.dragStart.set([
                parseFloat(e.target.style.left || "0"),
                parseFloat(e.target.style.top || "0")
            ]);
        }}
        onResize={e => {
            e.target.style.width = `${e.width}px`;
            e.target.style.height = `${e.height}px`;
            e.target.style.left = `${e.drag.beforeTranslate[0]}px`;
            e.target.style.top = `${e.drag.beforeTranslate[1]}px`;
        }}
        onResizeEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                updateElement(id, {
                    width: parseFloat(e.target.style.width || '0'),
                    height: parseFloat(e.target.style.height || '0'),
                    x: parseFloat(e.target.style.left || '0'),
                    y: parseFloat(e.target.style.top || '0')
                });
                commitHistory();
            }
        }}

        onResizeGroupStart={e => {
            e.events.forEach(ev => {
                ev.setOrigin(["%", "%"]);
                ev.dragStart && ev.dragStart.set([
                    parseFloat(ev.target.style.left || "0"),
                    parseFloat(ev.target.style.top || "0")
                ]);
            });
        }}
        onResizeGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.width = `${ev.width}px`;
                ev.target.style.height = `${ev.height}px`;
                ev.target.style.left = `${ev.drag.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.drag.beforeTranslate[1]}px`;
            });
        }}
        onResizeGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    updateElement(id, {
                        width: parseFloat(target.style.width || '0'),
                        height: parseFloat(target.style.height || '0'),
                        x: parseFloat(target.style.left || '0'),
                        y: parseFloat(target.style.top || '0')
                    });
                });
                commitHistory();
            }
        }}

        onRotateStart={e => {
            e.set(parseFloat(e.target.style.transform.replace('rotate(', '').replace('deg)', '') || "0"));
        }}
        onRotate={e => {
            e.target.style.transform = `rotate(${e.beforeRotate}deg)`;
        }}
        onRotateEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                const transform = e.target.style.transform;
                const match = transform.match(/rotate\(([\d.-]+)deg\)/);
                if (match) {
                    updateElement(id, { rotation: parseFloat(match[1]) });
                }
                commitHistory();
            }
        }}

        onRotateGroupStart={e => {
            e.events.forEach(ev => {
                ev.set(parseFloat(ev.target.style.transform.replace('rotate(', '').replace('deg)', '') || "0"));
            });
        }}
        onRotateGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.transform = `rotate(${ev.beforeRotate}deg)`;
                // When rotating a group, position also changes around origin
                ev.target.style.left = `${ev.drag.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.drag.beforeTranslate[1]}px`;
            });
        }}
        onRotateGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    const transform = target.style.transform;
                    const match = transform.match(/rotate\(([\d.-]+)deg\)/);
                    if (match) {
                        updateElement(id, { rotation: parseFloat(match[1]) });
                    }
                    updateElement(id, {
                        x: parseFloat(target.style.left || '0'),
                        y: parseFloat(target.style.top || '0')
                    });
                });
                commitHistory();
            }
        }}
      />

      {elements.map((el) => {
        return (
          <div
            key={el.id}
            id={`el-${el.id}`}
            className={`absolute element-node group`}
            onMouseDown={(e: React.MouseEvent) => {
              if ((e.target as HTMLElement).closest('.moveable-control-box')) return;
              if (e.shiftKey) {
                 selectElement(el.id, true);
              } else if (!selectedIds.includes(el.id)) {
                 selectElement(el.id, false);
              }
            }}
            onDoubleClick={(e) => {
               e.stopPropagation();
               if (el.type === 'text' || el.type === 'button') {
                  setEditingId(el.id);
               }
            }}
            style={{ 
              left: el.x, 
              top: el.y, 
              width: el.width, 
              height: el.height, 
              transform: `rotate(${el.rotation || 0}deg)`,
              zIndex: el.zIndex 
            }}
          >
            {/* TEXT */}
            {el.type === 'text' && (
              <div 
                className="w-full h-full flex items-center justify-center break-words select-none"
                style={{
                  fontFamily: el.fontFamily,
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.fontWeight,
                  color: el.color,
                  textAlign: el.textAlign,
                  lineHeight: el.lineHeight,
                }}
              >
                {el.id === 'headline-1' ? (
                  <HeadlineSlot niche="dental" elementId={el.id} />
                ) : editingId === el.id ? (
                  <textarea
                    className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden"
                    style={{ textAlign: el.textAlign || 'center' }}
                    autoFocus
                    defaultValue={el.content}
                    onBlur={(e) => {
                      updateElement(el.id, { content: e.target.value });
                      commitHistory();
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.blur();
                       }
                    }}
                  />
                ) : (
                  el.content
                )}
              </div>
            )}

            {/* BUTTON */}
            {el.type === 'button' && (
               <div className="w-full h-full flex items-center justify-center p-1">
                 <button 
                   className="w-full h-full leading-none truncate pointer-events-none uppercase tracking-widest shadow-xl flex items-center justify-center"
                   style={{
                     backgroundColor: el.backgroundColor,
                     color: el.color,
                     borderRadius: `${el.borderRadius}px`,
                     fontSize: `${el.fontSize}px`,
                     fontWeight: el.fontWeight,
                   }}
                 >
                   {editingId === el.id ? (
                      <input
                        className="w-full h-full bg-transparent border-none outline-none text-center pointer-events-auto"
                        autoFocus
                        defaultValue={el.content}
                        onBlur={(e) => {
                          updateElement(el.id, { content: e.target.value });
                          commitHistory();
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                           }
                        }}
                      />
                   ) : (
                      el.content
                   )}
                 </button>
               </div>
            )}

            {/* VISUALIZER */}
            {el.type === 'visualizer' && (
               <div className="w-full h-full flex items-center justify-center pointer-events-none">
                 {(el.visualizerType === 'bars-bottom' || !el.visualizerType) && (
                    <div className="w-full h-full flex items-end justify-between gap-1">
                      {Array.from({ length: el.barCount || 8 }).map((_, i) => (
                        <div
                          key={i}
                          ref={barEl => setBarRef(el.id, barEl, i, el.barCount || 8)}
                          className="flex-1 rounded-full"
                          style={{ backgroundColor: el.barColor || '#00ffcc', height: '4px', minWidth: '4px' }}
                        />
                      ))}
                    </div>
                 )}
                 {el.visualizerType === 'bars-center' && (
                    <div className="w-full h-full flex items-center justify-between gap-1">
                      {Array.from({ length: el.barCount || 8 }).map((_, i) => (
                        <div
                          key={i}
                          ref={barEl => setBarRef(el.id, barEl, i, el.barCount || 8)}
                          className="flex-1 rounded-full"
                          style={{ backgroundColor: el.barColor || '#00ffcc', height: '4px', minWidth: '4px' }}
                        />
                      ))}
                    </div>
                 )}
                 {['ai-orb', 'siri-wave', 'ai-blob', 'elevenlabs-v1', 'elevenlabs-v2', 'elevenlabs-v3', 'chatgpt-orb'].includes(el.visualizerType || '') && (
                    <canvas
                      ref={canvasEl => setBarRef(el.id, canvasEl as any, 0, 1)}
                      className="w-full h-full"
                    />
                 )}
               </div>
            )}

            {/* CAPTION */}
            {el.type === 'caption' && (
               <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  {currentCaption ? (
                    <div className="w-full h-full flex items-center justify-center p-2">
                       <p className="text-[16px] font-medium text-center leading-snug drop-shadow-sm line-clamp-2" style={{ color: el.color || accentColor }}>
                         {currentCaption}
                       </p>
                    </div>
                  ) : (
                    <div className="w-full h-full text-center flex items-center justify-center pointer-events-none">
                      <span className="text-[16px] font-medium p-2" style={{ color: el.color || accentColor }}>
                        {audioUrl ? "Captions will appear during playback" : "Upload audio for captions"}
                      </span>
                    </div>
                  )}
               </div>
            )}

            {/* IMAGE */}
            {el.type === 'image' && (
               <div className="w-full h-full flex items-center justify-center pointer-events-none overflow-hidden" style={{ borderRadius: el.borderRadius, mixBlendMode: el.mixBlendMode as any }}>
                 {el.imageUrl ? (
                   <TransparentImage src={el.imageUrl} className="w-full h-full object-contain" removeWhite={el.removeWhite} />
                 ) : (
                   <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                     <ImageIcon className="w-8 h-8 opacity-50" />
                   </div>
                 )}
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
