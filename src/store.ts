import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getRandomSeededHook } from './lib/headline-pool';

export type ElementType = 'text' | 'visualizer' | 'button' | 'caption' | 'image';

export interface AdElement {
  id: string;
  type: ElementType;
  componentRole?: 'headline' | 'subheadline' | 'logo' | 'visualizer' | 'captions' | 'cta' | 'image';
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  rotation: number;
  zIndex: number;
  // properties
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  
  visualizerSensitivity?: number;
  visualizerSmoothing?: number;
  visualizerHeight?: number;
  visualizerBaseline?: number;
  visualizerSplitSpeakers?: boolean;
  visualizerType?: 'bars-bottom' | 'bars-center' | 'waveform-strip' | 'ai-orb' | 'siri-wave' | 'ai-blob' | 'elevenlabs-v1' | 'elevenlabs-v2' | 'elevenlabs-v3' | 'chatgpt-orb';
  visualizerMirror?: boolean;
  barColor?: string;
  barCount?: number;
  
  // button
  backgroundColor?: string;
  borderRadius?: number;
  
  // image
  imageUrl?: string;
  mixBlendMode?: string;
  removeWhite?: boolean;
  imageShadow?: boolean;
  imageShadowOpacity?: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  speaker: number;
}

export type HistoryState = {
  elements: AdElement[];
};

interface EditorState {
  elements: AdElement[];
  selectedIds: string[];
  history: HistoryState[];
  historyIndex: number;
  showSafeZones: boolean;
  showRedGuides: boolean;
  captions: Caption[];
  businessContext: string;
  
  // Actions
  setElements: (elements: AdElement[] | ((prev: AdElement[]) => AdElement[])) => void;
  addElement: (element: Omit<AdElement, 'id'>) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<AdElement>) => void;
  selectElement: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  setShowSafeZones: (show: boolean) => void;
  setShowRedGuides: (show: boolean) => void;
  setCaptions: (captions: Caption[]) => void;
  setBusinessContext: (context: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  commitHistory: () => void;
  
  // Z-Order
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
}

const DEFAULT_ELEMENTS: AdElement[] = [
  {
    id: 'logo-1',
    type: 'image',
    componentRole: 'logo',
    imageUrl: '/logo.png',
    x: 120,
    y: 70,
    width: 120,
    height: 48,
    rotation: 0,
    zIndex: 10,
    removeWhite: true
  },
  {
    id: 'headline-1',
    type: 'text',
    componentRole: 'headline',
    content: getRandomSeededHook(),
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
    lineHeight: 1.04
  },
  {
    id: 'visualizer-1',
    type: 'visualizer',
    componentRole: 'visualizer',
    x: 0,
    y: 255,
    width: 360,
    height: 90,
    rotation: 0,
    zIndex: 3,
    visualizerType: 'bars-center',
    barColor: '#00ffcc',
    barCount: 16,
    visualizerSensitivity: 1.5,
    visualizerSmoothing: 0.85,
    visualizerHeight: 0.9,
    visualizerBaseline: 4,
    visualizerSplitSpeakers: false
  },
  {
    id: 'caption-1',
    type: 'caption',
    componentRole: 'captions',
    x: 20,
    y: 350,
    width: 320,
    height: 48,
    rotation: 0,
    zIndex: 4,
  }
];

export const useEditorStore = create<EditorState>((set, get) => ({
  elements: DEFAULT_ELEMENTS,
  selectedIds: [],
  history: [{ elements: DEFAULT_ELEMENTS }],
  historyIndex: 0,
  showSafeZones: false,
  showRedGuides: false,
  captions: [],
  businessContext: `[Name] Dr. Michael Carter
[Niche] Dental Practice Owners
[Location] US, suburban or urban
[Goal] Increase patient bookings & chair utilization without increasing overhead/hiring more staff
[Complaint] Missed calls and unhandled leads are causing lost revenue
[Desires] Consistent flow of new patients, Fully booked schedule, Automated front desk, Higher profitability without more workload
[Fear] Running a stagnant practice while competitors capture more patients
[Beliefs] More marketing = more growth, Staff is the only way to handle calls
[Alternative Solutions] Hiring more front desk staff ($40k-$70k/yr), Outsourcing call centers

Instead of missing calls, this ad is about how AI front-desk employees help growth-focused dentists automate call answering, book more patients, and eliminate missed-call revenue without hiring more staff.`,

  setShowSafeZones: (show) => set({ showSafeZones: show }),
  setShowRedGuides: (show) => set({ showRedGuides: show }),
  setCaptions: (captions) => set({ captions }),
  setBusinessContext: (context) => set({ businessContext: context }),

  setElements: (elementsOrUpdater) => {
    set((state) => {
      const newElements = typeof elementsOrUpdater === 'function' ? elementsOrUpdater(state.elements) : elementsOrUpdater;
      return { elements: newElements };
    });
  },

  addElement: (element) => {
    set((state) => {
      const newId = `el-${uuidv4()}`;
      const newElements = [...state.elements, { ...element, id: newId }];
      return { elements: newElements, selectedIds: [newId] };
    });
    get().commitHistory();
  },

  removeElement: (id) => {
    set((state) => {
      const newElements = state.elements.filter(el => el.id !== id);
      return { elements: newElements, selectedIds: state.selectedIds.filter(sid => sid !== id) };
    });
    get().commitHistory();
  },

  updateElement: (id, updates) => {
    set((state) => {
      const newElements = state.elements.map((el) => 
        el.id === id ? { ...el, ...updates } : el
      );
      return { elements: newElements };
    });
  },

  selectElement: (id, multi = false) => {
    set((state) => {
      if (multi) {
        if (state.selectedIds.includes(id)) {
           return { selectedIds: state.selectedIds.filter(selectedId => selectedId !== id) };
        }
        return { selectedIds: [...state.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },

  deselectAll: () => set({ selectedIds: [] }),

  commitHistory: () => {
    set((state) => {
      // If we made changes after an undo, slice off the future history
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ elements: JSON.parse(JSON.stringify(state.elements)) });
      
      // Keep last 50
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return { 
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          historyIndex: newIndex,
          elements: JSON.parse(JSON.stringify(state.history[newIndex].elements)),
          selectedIds: []
        };
      }
      return state;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          historyIndex: newIndex,
          elements: JSON.parse(JSON.stringify(state.history[newIndex].elements)),
          selectedIds: []
        };
      }
      return state;
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const maxZ = Math.max(...state.elements.map(e => e.zIndex), 0);
      return {
        elements: state.elements.map(el => el.id === id ? { ...el, zIndex: maxZ + 1 } : el)
      };
    });
    get().commitHistory();
  },

  sendToBack: (id) => {
    set((state) => {
      const minZ = Math.min(...state.elements.map(e => e.zIndex), 0);
      return {
        elements: state.elements.map(el => el.id === id ? { ...el, zIndex: minZ - 1 } : el)
      };
    });
    get().commitHistory();
  },

  bringForward: (id) => {
    set((state) => {
      const el = state.elements.find(e => e.id === id);
      if (!el) return state;
      return {
        elements: state.elements.map(e => e.id === id ? { ...e, zIndex: e.zIndex + 1 } : e)
      };
    });
    get().commitHistory();
  },

  sendBackward: (id) => {
    set((state) => {
      const el = state.elements.find(e => e.id === id);
      if (!el) return state;
      return {
        elements: state.elements.map(e => e.id === id ? { ...e, zIndex: e.zIndex - 1 } : e)
      };
    });
    get().commitHistory();
  }

}));
