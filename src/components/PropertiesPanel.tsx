import React from 'react';
import { useEditorStore, AdElement } from '../store';
// Added import for Sparkles icon
import { Save, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  // Pass down anything needed for global config
  saveTemplate: () => void;
  templates: any[];
  loadTemplate: (t: any) => void;
  // Global form fields state (deprecated but kept for compatibility)
  headline: string; setHeadline: (v: string) => void;
  subhead: string; setSubhead: (v: string) => void;
  ctaText: string; setCtaText: (v: string) => void;
}

export const PropertiesPanel: React.FC<Props> = ({
  saveTemplate,
  templates,
  loadTemplate,
  headline, setHeadline,
  subhead, setSubhead,
  ctaText, setCtaText,
}) => {
  const { selectedIds, elements, updateElement, setElements, businessContext, setBusinessContext } = useEditorStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedEl = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null;

  const handleGenerateCopy = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessContext })
      });
      
      if (!response.ok) {
        let errMsg = "Failed to generate copy";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (errJson) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      
      const newElements = elements.map(el => {
        if (el.id === 'headline-1' && data.headline) {
          return { ...el, content: data.headline.toUpperCase() };
        }
        if (el.id === 'subhead-1' && data.subhead) {
          return { ...el, content: data.subhead };
        }
        return el;
      });
      
      setElements(newElements);
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("API_KEY_INVALID") || e?.message?.includes("PERMISSION_DENIED")) {
        alert("API key not valid. Please configure a valid Gemini API Key through the Settings > Secrets panel.");
      } else {
        alert("Failed to generate copy: " + (e?.message || e));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (selectedIds.length > 1) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[300px] flex items-center justify-center flex-col gap-2">
         <span className="text-sm font-bold text-slate-500">Multiple Elements Selected</span>
         <span className="text-xs text-slate-400 text-center px-4">Move or resize them together on the canvas. Contextual properties are available only when a single element is selected.</span>
      </div>
    );
  }

  if (selectedEl) {
    return (
      <div className="bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Element Properties</h2>

        <div className="space-y-4">
          
          {/* COMMON PROPERTIES */}
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">X Position</label>
               <input 
                 type="number" 
                 value={Math.round(selectedEl.x)}
                 onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                 className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">Y Position</label>
               <input 
                 type="number" 
                 value={Math.round(selectedEl.y)}
                 onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                 className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">Width</label>
               <input 
                 type="number" 
                 value={parseInt(selectedEl.width as string)}
                 onChange={(e) => updateElement(selectedEl.id, { width: parseInt(e.target.value) || 0 })}
                 className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">Height</label>
               <input 
                 type="number" 
                 value={parseInt(selectedEl.height as string)}
                 onChange={(e) => updateElement(selectedEl.id, { height: parseInt(e.target.value) || 0 })}
                 className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
               />
             </div>
          </div>

          {/* TEXT PROPERTIES */}
          {selectedEl.type === 'text' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Content</label>
                <textarea 
                  value={selectedEl.content || ''}
                  onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Font Size (px)</label>
                   <input 
                     type="number" 
                     value={selectedEl.fontSize || 16}
                     onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })}
                     className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Weight</label>
                   <select 
                     value={selectedEl.fontWeight || 'normal'}
                     onChange={(e) => updateElement(selectedEl.id, { fontWeight: e.target.value })}
                     className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   >
                     <option value="normal">Normal</option>
                     <option value="500">Medium</option>
                     <option value="600">SemiBold</option>
                     <option value="bold">Bold</option>
                     <option value="800">ExtraBold</option>
                   </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Alignment</label>
                   <select 
                     value={selectedEl.textAlign || 'left'}
                     onChange={(e) => updateElement(selectedEl.id, { textAlign: e.target.value as any })}
                     className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   >
                     <option value="left">Left</option>
                     <option value="center">Center</option>
                     <option value="right">Right</option>
                   </select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Text Color</label>
                   <div className="flex bg-white items-center gap-2 border border-indigo-200 rounded-md px-2 py-1">
                      <input 
                        type="color" 
                        value={selectedEl.color || '#000000'}
                        onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <span className="text-xs text-slate-600 truncate">{selectedEl.color}</span>
                   </div>
                 </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Line Height</label>
                <input 
                  type="number" step="0.1"
                  value={selectedEl.lineHeight || 1.2}
                  onChange={(e) => updateElement(selectedEl.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                  className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                />
              </div>
            </>
          )}

          {/* BUTTON PROPERTIES */}
          {selectedEl.type === 'button' && (
             <>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Button Text</label>
                 <input 
                   type="text" 
                   value={selectedEl.content || ''}
                   onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                   className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Text Color</label>
                   <div className="flex bg-white items-center gap-2 border border-indigo-200 rounded-md px-2 py-1">
                      <input 
                        type="color" 
                        value={selectedEl.color || '#000000'}
                        onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Background</label>
                   <div className="flex bg-white items-center gap-2 border border-indigo-200 rounded-md px-2 py-1">
                      <input 
                        type="color" 
                        value={selectedEl.backgroundColor || '#4f46e5'}
                        onChange={(e) => updateElement(selectedEl.id, { backgroundColor: e.target.value })}
                        className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                      />
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Radius</label>
                   <input 
                     type="number" 
                     value={selectedEl.borderRadius || 0}
                     onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })}
                     className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-700">Font Size</label>
                   <input 
                     type="number" 
                     value={selectedEl.fontSize || 16}
                     onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })}
                     className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                 </div>
               </div>
             </>
          )}

          {/* VISUALIZER PROPERTIES */}
          {selectedEl.type === 'visualizer' && (
             <>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Style</label>
                 <select 
                   value={selectedEl.visualizerType || 'bars-bottom'}
                   onChange={(e) => updateElement(selectedEl.id, { visualizerType: e.target.value as any })}
                   className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                 >
                   <option value="bars-bottom">Bars (Bottom)</option>
                   <option value="bars-center">Bars (Center)</option>
                   <option value="ai-orb">AI Assistant Orb</option>
                   <option value="siri-wave">Siri Wave</option>
                   <option value="ai-blob">ThreeJS Blob</option>
                   <option value="elevenlabs-v1">11Labs Orb (Blue)</option>
                   <option value="elevenlabs-v2">11Labs Orb (Peach)</option>
                   <option value="elevenlabs-v3">11Labs Orb (Silver)</option>
                   <option value="chatgpt-orb">ChatGPT Aura</option>
                 </select>
               </div>
               <div className="flex items-center justify-between mt-2">
                 <label className="text-xs font-semibold text-slate-700">Mirror (Symmetry)</label>
                 <input 
                   type="checkbox"
                   checked={selectedEl.visualizerMirror || false}
                   onChange={(e) => updateElement(selectedEl.id, { visualizerMirror: e.target.checked })}
                   className="cursor-pointer"
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Color</label>
                 <div className="flex bg-white items-center gap-2 border border-indigo-200 rounded-md px-2 py-1">
                    <input 
                      type="color" 
                      value={selectedEl.barColor || '#00ffcc'}
                      onChange={(e) => updateElement(selectedEl.id, { barColor: e.target.value })}
                      className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                    />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Bar Count</label>
                 <input 
                   type="range"
                   min="3" max="32"
                   value={selectedEl.barCount || 8}
                   onChange={(e) => updateElement(selectedEl.id, { barCount: parseInt(e.target.value) })}
                   className="w-full"
                 />
               </div>
               <div className="flex items-center justify-between mt-4">
                 <div className="flex items-center gap-2">
                   <label className="text-xs font-semibold text-slate-700">Sensitivity</label>
                   <button 
                     onClick={() => updateElement(selectedEl.id, { visualizerSensitivity: 1.0 })}
                     className="text-slate-400 hover:text-slate-600 transition-colors"
                     title="Reset to default (1.0x)"
                   >
                     <RotateCcw size={12} />
                   </button>
                 </div>
                 <span className="text-xs text-slate-500">{(selectedEl.visualizerSensitivity ?? 1.0).toFixed(1)}x</span>
               </div>
               <div className="relative pb-2 mt-1">
                 <input 
                   type="range"
                   min="0.1" max="5.0" step="0.1"
                   value={selectedEl.visualizerSensitivity ?? 1.0}
                   onChange={(e) => updateElement(selectedEl.id, { visualizerSensitivity: parseFloat(e.target.value) })}
                   className="w-full cursor-pointer relative z-10"
                 />
                 <div className="absolute top-[18px] left-[18.36%] w-0.5 h-1.5 bg-slate-400 transform -translate-x-1/2" title="Default: 1.0x" />
               </div>

               <div className="flex items-center gap-2 mt-4 cursor-pointer" onClick={() => updateElement(selectedEl.id, { visualizerSplitSpeakers: !selectedEl.visualizerSplitSpeakers })}>
                 <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedEl.visualizerSplitSpeakers ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                    {selectedEl.visualizerSplitSpeakers && <div className="w-2 h-2 bg-white rounded-sm" />}
                 </div>
                 <span className="text-sm text-slate-700">Split by Speaker</span>
               </div>

               <div className="flex items-center justify-between mt-4">
                 <div className="flex items-center gap-2">
                   <label className="text-xs font-semibold text-slate-700">Smoothing</label>
                   <button 
                     onClick={() => updateElement(selectedEl.id, { visualizerSmoothing: 0.8 })}
                     className="text-slate-400 hover:text-slate-600 transition-colors"
                     title="Reset to default (0.8)"
                   >
                     <RotateCcw size={12} />
                   </button>
                 </div>
                 <span className="text-xs text-slate-500">{selectedEl.visualizerSmoothing ?? 0.8}</span>
               </div>
               <div className="relative pb-2 mt-1">
                 <input 
                   type="range"
                   min="0.05" max="0.95" step="0.05"
                   value={selectedEl.visualizerSmoothing ?? 0.8}
                   onChange={(e) => updateElement(selectedEl.id, { visualizerSmoothing: parseFloat(e.target.value) })}
                   className="w-full cursor-pointer relative z-10"
                 />
                 <div className="absolute top-[18px] left-[83.33%] w-0.5 h-1.5 bg-slate-400 transform -translate-x-1/2" title="Default: 0.8" />
               </div>
             </>
          )}
          
          {/* CAPTION PROPERTIES */}
          {selectedEl.type === 'caption' && (
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">Speaker Highlight Color</label>
               <div className="flex bg-white items-center gap-2 border border-indigo-200 rounded-md px-2 py-1">
                  <input 
                    type="color" 
                    value={selectedEl.color || '#4f46e5'}
                    onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                    className="w-4 h-4 rounded-sm cursor-pointer bg-transparent border-0 p-0" 
                  />
               </div>
             </div>
          )}

          {/* IMAGE PROPERTIES */}
          {selectedEl.type === 'image' && (
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-slate-700">Border Radius (px)</label>
               <input 
                 type="number" 
                 value={selectedEl.borderRadius || 0}
                 onChange={(e) => updateElement(selectedEl.id, { borderRadius: parseInt(e.target.value) || 0 })}
                 className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
               />
             </div>
          )}

        </div>
      </div>
    );
  }

  // GLOBAL CONFIG
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ad Content (Global)</h2>
        <button 
          onClick={saveTemplate}
          className="text-xs font-semibold px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 text-slate-600 hover:text-slate-900"
        >
          <Save className="w-3.5 h-3.5" /> Save Preset
        </button>
      </div>

      {/* Templates Dropdown */}
      {templates.length > 0 && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Saved Presets</label>
          <div className="flex flex-wrap gap-2">
            {templates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => loadTemplate(t)}
                className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 hover:border-indigo-300 rounded-md transition-all font-medium"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Magic AI Copy Generator */}
      <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          AI Magic Copy
        </label>
        <div className="space-y-2">
          <textarea 
            value={businessContext}
            onChange={e => setBusinessContext(e.target.value)}
            placeholder="What does your business do?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" 
            rows={3}
          />
          <button 
            onClick={handleGenerateCopy}
            disabled={isGenerating || !businessContext.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm rounded-md hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Rewrite Ad Copy'}
          </button>
        </div>
      </div>
      
      <p className="mt-4 text-[10px] text-slate-400 italic text-center">
        Select elements on canvas to edit properties.
      </p>

    </div>
  );
};
