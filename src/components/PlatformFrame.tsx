import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, User, Music, VolumeX, Battery, Wifi, Signal, ChevronUp, X as XIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PlatformType = 'vertical' | 'feed';

interface PlatformFrameProps {
  platform: PlatformType;
  theme: 'light' | 'dark';
  brandName?: string;
  brandLogo?: string | null;
  caption?: string;
  metaCta?: string;
  children: React.ReactNode;
}

function StatusBar({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center text-[12px] font-medium mb-2 py-1 drop-shadow-md", isDark ? "text-white" : "text-slate-800 drop-shadow-none")}>
      <span className="font-semibold tracking-wide">9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
        <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
        <Battery className="w-4 h-4 stroke-[2.5]" />
      </div>
    </div>
  );
}

export function PlatformFrame({
  platform,
  theme,
  brandName = 'brand_name',
  brandLogo = null,
  caption = 'Awesome ad caption right here.',
  metaCta = 'Learn More',
  children
}: PlatformFrameProps) {
  const isDark = theme === 'dark';
  
  const frameClasses = cn(
    "relative overflow-hidden rounded-[30px] border shadow-2xl transition-colors duration-300 mx-auto",
    isDark ? "bg-black border-slate-800 text-white" : "bg-white border-slate-200 text-black"
  );

  const getContainerSize = () => {
    return 'w-[360px] h-[720px]'; // Device frame size
  };

  const adContainerAspect = 
    platform === 'vertical' ? 'aspect-[9/16]' : 'aspect-[4/5]';

  return (
    <div className={cn(frameClasses, getContainerSize(), "flex flex-col")}>
      
      {/* Frame Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* The actual rendered AD */}
        <div className={cn(
          "absolute pointer-events-auto",
          platform === 'feed' ? "top-[60px] bottom-[160px] left-0 right-0" : "inset-0",
          "flex items-center justify-center overflow-hidden bg-slate-900"
        )}>
           <div className={cn("w-full h-full max-w-full max-h-full mx-auto relative", adContainerAspect)}>
                 {children}
           </div>
        </div>

        {/* Feed Frame (Instagram/Facebook style preview) */}
        {platform === 'feed' && (
           <div className="absolute inset-0 z-10 pointer-events-none flex flex-col h-full bg-transparent">
              {/* Header */}
              <div className={cn("px-4 py-3 flex items-center justify-between", isDark ? "bg-black" : "bg-white")}>
                 <div className="flex items-center gap-2 relative z-20">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-200", isDark ? "border-slate-800 bg-slate-900" : "bg-slate-100")}>
                      {brandLogo ? <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" /> : <User className={cn("w-4 h-4", isDark ? "text-slate-400" : "text-slate-500")} />}
                    </div>
                    <div>
                       <div className="flex items-center gap-1">
                          <span className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-black")}>{brandName}</span>
                       </div>
                       <span className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>Sponsored</span>
                    </div>
                 </div>
                 <div className="relative z-20 flex items-center gap-3">
                   <MoreHorizontal className={cn("w-5 h-5", isDark ? "text-white" : "text-black")} />
                 </div>
              </div>

              <div className="flex-1 pointer-events-none relative z-0">
                 {/* Ad content space */}
              </div>

              {/* Bottom Actions */}
              <div className={cn("px-4 py-3 flex flex-col gap-3 relative z-20 pointer-events-auto", isDark ? "bg-black" : "bg-white")}>
                 <div className={cn("w-full py-2.5 rounded flex items-center justify-between px-4 text-[13px] font-bold cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.99]", isDark ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600")}>
                    <span>{metaCta}</span>
                    <ChevronUp className="w-4 h-4" />
                 </div>
                 <div className="flex justify-between items-center px-1">
                    <div className="flex gap-4">
                       <Heart className={cn("w-6 h-6 hover:opacity-70 cursor-pointer", isDark ? "text-white" : "text-black")} />
                       <MessageCircle className={cn("w-6 h-6 hover:opacity-70 cursor-pointer", isDark ? "text-white" : "text-black")} />
                       <Send className={cn("w-6 h-6 hover:opacity-70 cursor-pointer", isDark ? "text-white" : "text-black")} />
                    </div>
                    <Bookmark className={cn("w-6 h-6 hover:opacity-70 cursor-pointer", isDark ? "text-white" : "text-black")} />
                 </div>
                 <div className={cn("text-[13px] px-1", isDark ? "text-white" : "text-black")}>
                    <span className="font-bold mr-2">{brandName}</span>
                    <span className={cn(isDark ? "text-slate-300" : "text-slate-700")}>{caption.substring(0, 100)}{caption.length > 100 ? '...' : ''}</span>
                 </div>
              </div>
           </div>
        )}
        {platform === 'vertical' && (
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
            {/* Top Area */}
             <div className="px-4 pt-2">
                <StatusBar isDark={isDark} />
                <div className={cn("flex justify-between items-start drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")}>
                   <h2 className="font-bold text-[18px]">Reels / Stories</h2>
                   <VolumeX className="w-5 h-5" />
                </div>
             </div>
            
            <div className={cn("absolute bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end pb-4 pt-32 z-10 w-full", isDark ? "bg-gradient-to-t from-black/60 via-black/20 to-transparent" : "bg-gradient-to-t from-white/60 via-white/20 to-transparent")}>
               {/* Left Flow Column containing CTA and Info */}
               <div className="px-4 pr-[64px] flex flex-col w-full pointer-events-none z-10 relative">
                  
                  <div className={cn("backdrop-blur-md rounded-full px-6 py-[14px] mb-4 flex items-center justify-between pointer-events-none shadow-lg mt-2 absolute bottom-[100%] right-4 left-4", isDark ? "bg-white/95" : "bg-slate-900/95")}>
                     <span className={cn("text-[14px] font-semibold flex-1 text-center ml-4", isDark ? "text-black" : "text-white")}>{metaCta}</span>
                     <ChevronUp className={cn("w-5 h-5 opacity-80", isDark ? "text-black" : "text-white")} />
                  </div>

                  <div className="flex-1 max-w-[240px] mb-2 pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("w-8 h-8 rounded-full border overflow-hidden flex items-center justify-center shrink-0", isDark ? "border-white/20 bg-slate-900" : "border-slate-800/10 bg-white shadow-sm")}>
                         {brandLogo ? <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" /> : <User className={cn("w-4 h-4", isDark ? "text-white" : "text-slate-800")} />}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("font-bold text-[14px] drop-shadow-md cursor-pointer hover:opacity-80", isDark ? "text-white" : "text-black drop-shadow-none")}>{brandName}</span>
                        <span className={cn("text-[12px] font-normal", isDark ? "text-white/80" : "text-slate-600")}>Ad</span>
                      </div>
                    </div>
                    <p className={cn("text-[13px] line-clamp-2 drop-shadow-md leading-snug cursor-pointer", isDark ? "text-white" : "text-black drop-shadow-none")}>{caption}</p>
                  </div>
               </div>
               
               {/* Fixed Action Rail */}
               <div className="absolute right-4 bottom-4 flex flex-col items-center gap-5 drop-shadow-md pointer-events-auto z-20">
                 <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                   <Heart className={cn("w-7 h-7 drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")} />
                 </div>
                 <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                   <MessageCircle className={cn("w-7 h-7 drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")} />
                 </div>
                 <button className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                   <Send className={cn("w-7 h-7 drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")} />
                 </button>
                 <button className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                   <MoreHorizontal className={cn("w-6 h-6 drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")} />
                 </button>
               </div>
            </div>

            {/* Bottom Progress Tracker */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-[2px]", isDark ? "bg-white/20" : "bg-black/10")}>
                <div className={cn("h-full w-[30%]", isDark ? "bg-white" : "bg-slate-800")}></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
