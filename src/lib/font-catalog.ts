export type FontVibe = 'Bold' | 'Modern' | 'Friendly' | 'Serif' | 'Accent';

export interface FontOption {
  name: string;
  family: string;
  vibe: FontVibe;
  bestFor: string;
}

export const FONT_CATALOG: FontOption[] = [
  { name: 'Montserrat', family: 'Montserrat, sans-serif', vibe: 'Bold', bestFor: 'Direct-response hooks and big numeric claims' },
  { name: 'Anton', family: 'Anton, sans-serif', vibe: 'Bold', bestFor: 'Short, loud scroll-stopper headlines' },
  { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', vibe: 'Bold', bestFor: 'Tall condensed headline layouts' },
  { name: 'Archivo Black', family: '"Archivo Black", sans-serif', vibe: 'Bold', bestFor: 'Heavy display headlines with a modern feel' },
  { name: 'Inter', family: 'Inter, sans-serif', vibe: 'Modern', bestFor: 'Clean Meta ad body copy and CTAs' },
  { name: 'Geist', family: '"Geist Variable", sans-serif', vibe: 'Modern', bestFor: 'Premium AI and SaaS brands' },
  { name: 'DM Sans', family: '"DM Sans", sans-serif', vibe: 'Modern', bestFor: 'Readable modern support copy' },
  { name: 'Poppins', family: 'Poppins, sans-serif', vibe: 'Friendly', bestFor: 'Local services and approachable brands' },
  { name: 'Nunito', family: 'Nunito, sans-serif', vibe: 'Friendly', bestFor: 'Soft, warm, low-friction creative' },
  { name: 'Playfair Display', family: '"Playfair Display", serif', vibe: 'Serif', bestFor: 'Luxury, med-spa, beauty, and authority hooks' },
  { name: 'Lora', family: 'Lora, serif', vibe: 'Serif', bestFor: 'Premium editorial support text' },
  { name: 'Caveat', family: 'Caveat, cursive', vibe: 'Accent', bestFor: 'One-word handwritten emphasis' },
  { name: 'Permanent Marker', family: '"Permanent Marker", cursive', vibe: 'Accent', bestFor: 'Sparingly used punchy annotation text' },
];

export const FONT_PAIRING_RULE = 'Use at most two fonts per ad: one display font for the headline and one clean font for supporting copy/CTA.';
