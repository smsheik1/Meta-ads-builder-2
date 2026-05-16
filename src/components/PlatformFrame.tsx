import React from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, User, VolumeX, Battery, Wifi, Signal, ChevronUp, ThumbsUp, Share2, Globe2, Bookmark } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PlatformType = 'facebook-feed' | 'instagram-feed' | 'reels' | 'stories' | 'vertical' | 'feed';

export const isFeedPlatform = (platform: PlatformType) => platform === 'facebook-feed' || platform === 'instagram-feed' || platform === 'feed';
export const isVerticalPlatform = (platform: PlatformType) => platform === 'reels' || platform === 'stories' || platform === 'vertical';

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

  const feedPlatform = isFeedPlatform(platform);
  const instagramFeed = platform === 'instagram-feed';
  const storiesPlatform = platform === 'stories';
  const verticalPlatform = isVerticalPlatform(platform);
  const verticalLabel = platform === 'stories' ? 'Stories' : 'Reels';
  const adContainerAspect = verticalPlatform ? 'aspect-[9/16]' : 'aspect-[4/5]';

  return (
    <div className={cn(frameClasses, getContainerSize(), "flex flex-col")}>
      
      {/* Frame Content */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* The actual rendered AD */}
        <div className={cn(
          "absolute z-0 pointer-events-auto",
          feedPlatform ? "top-[60px] left-0 right-0 h-[450px]" : "inset-0",
          "flex items-center justify-center overflow-hidden bg-slate-900"
        )}>
           <div className={cn("w-full h-full max-w-full max-h-full mx-auto relative", adContainerAspect)}>
                 {children}
           </div>
        </div>

        {/* Facebook Feed preview */}
        {feedPlatform && !instagramFeed && (
           <div className="absolute inset-0 z-30 pointer-events-none flex flex-col h-full bg-transparent">
              {/* Header */}
              <div className={cn("px-4 py-3 flex items-center justify-between border-b", isDark ? "bg-black border-slate-900" : "bg-white border-slate-100")}>
                 <div className="flex items-center gap-2 relative z-20">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 border", isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-100")}>
                      {brandLogo ? <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" /> : <User className={cn("w-4 h-4", isDark ? "text-slate-400" : "text-slate-500")} />}
                    </div>
                    <div>
                       <div className="flex items-center gap-1">
                          <span className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-black")}>{brandName}</span>
                       </div>
                       <span className={cn("flex items-center gap-1 text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>
                         Sponsored · <Globe2 className="h-3 w-3" />
                       </span>
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
              <div className={cn("px-3 py-2 flex flex-col gap-1.5 relative z-20 pointer-events-auto border-t", isDark ? "bg-black border-slate-900" : "bg-white border-slate-100")}>
                 <div className={cn("flex items-start justify-between gap-2 px-1 text-[12px] leading-snug", isDark ? "text-white" : "text-black")}>
                   <div className="min-w-0">
                     <span className="font-bold mr-2">{brandName}</span>
                     <span className={cn(isDark ? "text-slate-300" : "text-slate-700")}>{caption.substring(0, 72)}{caption.length > 72 ? '...' : ''}</span>
                   </div>
                   <button className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]">
                     {metaCta}
                   </button>
                 </div>
                 <div className={cn("flex items-center justify-between border-y py-1 text-[11px]", isDark ? "border-slate-900 text-slate-400" : "border-slate-100 text-slate-500")}>
                   <span>1.2K reactions</span>
                   <span>84 comments · 19 shares</span>
                 </div>
                 <div className="grid grid-cols-3 gap-1 px-1">
                    {[
                      { label: 'Like', icon: ThumbsUp },
                      { label: 'Comment', icon: MessageCircle },
                      { label: 'Share', icon: Share2 },
                    ].map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        className={cn("flex items-center justify-center gap-1 rounded-md py-1 text-[12px] font-semibold transition hover:bg-slate-100", isDark ? "text-slate-300 hover:bg-slate-900" : "text-slate-600")}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {/* Instagram Feed preview */}
        {instagramFeed && (
           <div className="absolute inset-0 z-30 pointer-events-none flex flex-col h-full bg-transparent">
              <div className={cn("px-3 py-2.5 flex items-center justify-between border-b", isDark ? "bg-black border-slate-900" : "bg-white border-slate-100")}>
                 <div className="flex items-center gap-2 relative z-20 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                      <div className={cn("h-full w-full rounded-full overflow-hidden border-2 flex items-center justify-center", isDark ? "bg-black border-black" : "bg-white border-white")}>
                        {brandLogo ? <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" /> : <User className={cn("w-4 h-4", isDark ? "text-slate-300" : "text-slate-700")} />}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className={cn("truncate text-sm font-bold leading-tight", isDark ? "text-white" : "text-black")}>{brandName}</div>
                      <div className={cn("text-[11px] leading-tight", isDark ? "text-slate-400" : "text-slate-500")}>Sponsored</div>
                    </div>
                 </div>
                 <MoreHorizontal className={cn("h-5 w-5 shrink-0", isDark ? "text-white" : "text-black")} />
              </div>

              <div className="flex-1 pointer-events-none relative z-0">
                 {/* Ad content space */}
              </div>

              <div className={cn("relative z-20 border-t px-3 py-2 pointer-events-auto", isDark ? "bg-black border-slate-900" : "bg-white border-slate-100")}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart className={cn("h-6 w-6", isDark ? "text-white" : "text-black")} />
                    <MessageCircle className={cn("h-6 w-6", isDark ? "text-white" : "text-black")} />
                    <Send className={cn("h-6 w-6", isDark ? "text-white" : "text-black")} />
                  </div>
                  <Bookmark className={cn("h-6 w-6", isDark ? "text-white" : "text-black")} />
                </div>
                <div className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-black")}>1,284 likes</div>
                <p className={cn("mt-1 text-[12px] leading-snug", isDark ? "text-slate-200" : "text-slate-800")}>
                  <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>{brandName}</span>{' '}
                  {caption.substring(0, 92)}{caption.length > 92 ? '...' : ''}
                </p>
                <button className={cn("mt-1 text-[12px]", isDark ? "text-slate-500" : "text-slate-400")}>View all 84 comments</button>
                <div className={cn("mt-1 text-[10px] uppercase tracking-wide", isDark ? "text-slate-600" : "text-slate-400")}>Sponsored</div>
              </div>
           </div>
        )}
        {/* Instagram Stories preview */}
        {storiesPlatform && (
          <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between">
            <div className="px-3 pt-3">
              <div className="mb-2 grid grid-cols-3 gap-1">
                {[0, 1, 2].map((segment) => (
                  <div key={segment} className="h-0.5 overflow-hidden rounded-full bg-white/35">
                    <div className={cn("h-full rounded-full", segment === 0 ? "w-[72%]" : "w-0", isDark ? "bg-white" : "bg-slate-900")} />
                  </div>
                ))}
              </div>
              <div className={cn("flex items-center justify-between drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")}>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                    <div className={cn("h-full w-full rounded-full overflow-hidden border-2 flex items-center justify-center", isDark ? "bg-black border-black" : "bg-white border-white")}>
                      {brandLogo ? <img src={brandLogo} alt={brandName} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold">{brandName}</div>
                    <div className="text-[11px] opacity-80">Sponsored</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="h-5 w-5" />
                  <MoreHorizontal className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className={cn("absolute bottom-0 left-0 right-0 pointer-events-none px-3 pb-4 pt-20", isDark ? "bg-gradient-to-t from-black/55 via-black/20 to-transparent" : "bg-gradient-to-t from-white/60 via-white/20 to-transparent")}>
              <div className="mb-3 flex justify-center">
                <button className={cn("rounded-full px-8 py-3 text-[14px] font-bold shadow-lg backdrop-blur-md", isDark ? "bg-white/95 text-black" : "bg-slate-950/95 text-white")}>
                  {metaCta}
                </button>
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className={cn("flex-1 rounded-full border px-4 py-3 text-[13px] font-medium backdrop-blur-md", isDark ? "border-white/70 text-white" : "border-slate-900/30 text-slate-900")}>
                  Send message
                </div>
                <Heart className={cn("h-7 w-7 shrink-0", isDark ? "text-white" : "text-slate-900")} />
                <Send className={cn("h-7 w-7 shrink-0", isDark ? "text-white" : "text-slate-900")} />
              </div>
            </div>
          </div>
        )}

        {/* Instagram Reels preview */}
        {verticalPlatform && !storiesPlatform && (
          <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between">
            {/* Top Area */}
             <div className="px-4 pt-2">
                <StatusBar isDark={isDark} />
                <div className={cn("flex justify-between items-start drop-shadow-md", isDark ? "text-white" : "text-black drop-shadow-none")}>
                   <h2 className="font-bold text-[18px]">{verticalLabel}</h2>
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
