// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { AudioLines, ArrowRight, Heart, MessageCircle, Send, Wand2 } from 'lucide-react';
import { ShareAdPage } from './routes/ShareAdPage';
import { getHostedSharePageBySlug, type SharePageRecord } from './lib/share-pages';
import { CreatePage, type CreatePageRoute } from './features/create/CreatePage';

const PERSONA_DECKS = [
  {
    persona: 'Dental',
    customer: 'Dental practices',
    angle: 'Missed-call recovery',
    color: '#00FFCC',
    pain: 'High',
    speed: 'Fast',
    cards: [
      { headline: 'One lunch break can cost a $3,200 case.', background: '#00FFCC', accent: '#4F46E5' },
      { headline: "You don't need more leads. You need answered calls.", background: '#FFFFFF', accent: '#00FFCC' },
      { headline: 'Every voicemail is a patient choosing someone else.', background: '#080B16', accent: '#60A5FA', dark: true },
    ],
  },
  {
    persona: 'Med spa',
    customer: 'Med spa owners',
    angle: 'Luxury consults',
    color: '#F0ABFC',
    pain: 'Medium',
    speed: 'Fast',
    cards: [
      { headline: 'Empty consult slots are not a demand problem.', background: '#FFFFFF', accent: '#F0ABFC' },
      { headline: 'Your best leads are asking one question: price.', background: '#080B16', accent: '#F0ABFC', dark: true },
      { headline: 'Turn interest into booked consultations.', background: '#F0ABFC', accent: '#4F46E5' },
    ],
  },
  {
    persona: 'HVAC',
    customer: 'Home service teams',
    angle: 'Emergency calls',
    color: '#60A5FA',
    pain: 'High',
    speed: 'Urgent',
    cards: [
      { headline: 'The hottest lead is the one calling right now.', background: '#080B16', accent: '#60A5FA', dark: true },
      { headline: 'After-hours calls should still become booked jobs.', background: '#00FFCC', accent: '#4F46E5' },
      { headline: 'Miss the call. Lose the job.', background: '#FFFFFF', accent: '#60A5FA' },
    ],
  },
  {
    persona: 'Legal',
    customer: 'Law firms',
    angle: 'After-hours intake',
    color: '#FBBF24',
    pain: 'High',
    speed: 'Steady',
    cards: [
      { headline: 'New cases do not wait for office hours.', background: '#FBBF24', accent: '#4F46E5' },
      { headline: 'Your intake form is not answering the phone.', background: '#FFFFFF', accent: '#FBBF24' },
      { headline: 'Capture the case before they call another firm.', background: '#080B16', accent: '#FBBF24', dark: true },
    ],
  },
  {
    persona: 'Fitness',
    customer: 'Fitness studios',
    angle: 'Trial bookings',
    color: '#FB7185',
    pain: 'Medium',
    speed: 'Fast',
    cards: [
      { headline: 'Trial leads go cold faster than you think.', background: '#FB7185', accent: '#00FFCC' },
      { headline: 'More DMs should become booked intros.', background: '#FFFFFF', accent: '#FB7185' },
      { headline: 'Stop letting motivated leads drift away.', background: '#080B16', accent: '#FB7185', dark: true },
    ],
  },
  {
    persona: 'Real estate',
    customer: 'Real estate teams',
    angle: 'Lead follow-up',
    color: '#A78BFA',
    pain: 'Medium',
    speed: 'Fast',
    cards: [
      { headline: 'The first agent to respond usually wins.', background: '#A78BFA', accent: '#00FFCC' },
      { headline: 'Every Zillow lead needs instant follow-up.', background: '#FFFFFF', accent: '#A78BFA' },
      { headline: 'Speed-to-lead is the whole game.', background: '#080B16', accent: '#A78BFA', dark: true },
    ],
  },
];

type AppRoute = 'home' | 'builder' | 'share' | 'create';

const getAppRoute = (): { route: AppRoute; shareSlug: string | null } => {
  const host = window.location.hostname;
  const shouldForceCreateRoute = host === 'wiggly.agentenamel.com' || host === 'www.wiggly.agentenamel.com';
  const match = window.location.pathname.match(/^\/s\/([^/?#]+)/);
  if (match) return { route: 'share', shareSlug: decodeURIComponent(match[1]) };
  if (shouldForceCreateRoute && window.location.pathname === '/') return { route: 'create', shareSlug: null };
  if (window.location.pathname === '/create') return { route: 'create', shareSlug: null };
  if (window.location.pathname === '/builder') return { route: 'builder', shareSlug: null };
  return { route: 'home', shareSlug: null };
};

const isCreateHomepageHost = () => {
  const host = window.location.hostname;
  return host === 'wiggly.agentenamel.com' || host === 'www.wiggly.agentenamel.com';
};

const useIsMobileViewport = () => {
  const getIsMobile = () => typeof window !== 'undefined'
    && window.matchMedia('(max-width: 767px)').matches;
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const widthQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(widthQuery.matches);
    update();
    widthQuery.addEventListener('change', update);
    return () => {
      widthQuery.removeEventListener('change', update);
    };
  }, []);

  return isMobile;
};

function MobileComputerGate() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F4EC] px-5 py-8 font-sans text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between">
        <header className="flex items-center gap-3">
          <img src="/wiggly-logo.svg" alt="Wiggly" className="h-11 w-11 rounded-2xl shadow-sm shadow-slate-950/10" />
          <span>
            <span className="block text-xl font-black leading-none">Wiggly</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Visual ads that move fast</span>
          </span>
        </header>

        <section className="py-10 text-center">
          <div className="relative mx-auto mb-8 aspect-[9/16] w-[min(68vw,270px)] rounded-[2.2rem] border-[10px] border-white bg-slate-950 shadow-2xl shadow-slate-950/15">
            <div className="absolute inset-0 overflow-hidden rounded-[1.55rem] bg-[#FAF9F4]">
              <div className="h-[13%] bg-slate-950" />
              <div className="flex h-[51%] flex-col items-center justify-center px-5 py-6">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/20">
                  <img src="/wiggly-logo.svg" alt="" className="h-10 w-10 rounded-xl" />
                </div>
                <p className="max-w-[12rem] text-3xl font-black leading-[0.95] tracking-normal text-slate-950">
                  Make ads from voice recordings.
                </p>
                <div className="mt-7 flex items-center justify-center gap-2">
                  <span className="h-3 w-12 rounded-full bg-[#00D6B8]" />
                  <span className="h-3 w-7 rounded-full bg-[#4F46E5]" />
                  <span className="h-3 w-16 rounded-full bg-[#00D6B8]" />
                  <span className="h-3 w-9 rounded-full bg-[#4F46E5]" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 min-h-[30%] bg-slate-950 px-5 py-5 text-left">
                <div className="mb-4 flex gap-4 text-white">
                  <Heart className="h-6 w-6" />
                  <MessageCircle className="h-6 w-6" />
                  <Send className="h-6 w-6" />
                </div>
                <p className="text-[13px] font-black leading-5 text-white">Drop a call recording. Hit space until your ad looks unreal.</p>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-black leading-[0.95] tracking-normal">
            Open Wiggly on your computer.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base font-semibold leading-7 text-slate-500">
            The app uses a real canvas, keyboard rerolls, locks, dragging, and video export. It is built for desktop and laptop screens.
          </p>
        </section>

        <footer className="space-y-3 pb-2">
          <p className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-center text-sm font-black leading-6 text-slate-600 shadow-xl shadow-slate-950/8">
            Come back on a bigger screen and make the ad properly.
          </p>
        </footer>
      </div>
    </main>
  );
}

const HomeAdCard = ({
  headline,
  accent = '#4F46E5',
  background = '#10F5B1',
  dark = false,
}: {
  headline: string;
  accent?: string;
  background?: string;
  dark?: boolean;
}) => (
  <div
    className={`relative aspect-[9/16] overflow-hidden rounded-2xl border p-5 shadow-sm ${dark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-950'}`}
    style={{ background }}
  >
    <div className="mx-auto mb-8 h-2 w-10 rounded-full opacity-70" style={{ backgroundColor: accent }} />
    <p className="mx-auto max-w-[190px] text-center text-2xl font-black leading-[0.9] tracking-normal">{headline}</p>
    <div className="absolute inset-x-6 top-[52%] flex h-12 items-center justify-center gap-1">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="w-2 rounded-full"
          style={{
            height: `${18 + ((index * 13) % 48)}px`,
            backgroundColor: index % 5 === 0 ? accent : '#00FFCC',
          }}
        />
      ))}
    </div>
    <div className="absolute bottom-[24%] left-1/2 h-2 w-24 -translate-x-1/2 rounded-full" style={{ backgroundColor: accent }} />
  <div className="absolute bottom-5 left-5 right-5 h-10 rounded-full bg-white/90" />
  </div>
);

export default function App() {
  const initialRoute = getAppRoute();
  const [appRoute, setAppRoute] = useState<AppRoute>(initialRoute.route);
  const [shareSlug, setShareSlug] = useState<string | null>(initialRoute.shareSlug);
  const showHomepage = appRoute === 'home';
  const isMobileViewport = useIsMobileViewport();
  const [sharePageRecord, setSharePageRecord] = useState<SharePageRecord | null>(null);
  const [sharePageLoading, setSharePageLoading] = useState(false);

  useEffect(() => {
    if (appRoute === 'create' && isCreateHomepageHost() && window.location.pathname === '/') {
      window.history.replaceState(null, '', '/create');
    }
  }, [appRoute]);

  const openRoute = (route: AppRoute, path: string, nextShareSlug: string | null = null) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setAppRoute(route);
    setShareSlug(nextShareSlug);
  };

  const enterStudio = () => openRoute('builder', '/builder');
  const openCreateFlow = () => openRoute('create', '/create');
  const openHomepage = () => openRoute('home', '/');

  const handleCreateRouteChange = (route: CreatePageRoute) => {
    openRoute(route, route === 'create' ? '/create' : '/builder');
  };

  useEffect(() => {
    const syncPageFromUrl = () => {
      const nextRoute = getAppRoute();
      setAppRoute(nextRoute.route);
      setShareSlug(nextRoute.shareSlug);
    };
    window.addEventListener('popstate', syncPageFromUrl);
    return () => window.removeEventListener('popstate', syncPageFromUrl);
  }, []);

  useEffect(() => {
    if (appRoute !== 'share' || !shareSlug) {
      setSharePageRecord(null);
      return;
    }

    let cancelled = false;
    setSharePageLoading(true);
    getHostedSharePageBySlug(shareSlug)
      .then((record) => {
        if (!cancelled) setSharePageRecord(record);
      })
      .finally(() => {
        if (!cancelled) setSharePageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appRoute, shareSlug]);

  useEffect(() => {
    if (appRoute !== 'share') {
      document.title = 'Wiggly';
      return;
    }

    const title = sharePageRecord?.headline ? `${sharePageRecord.headline} | Wiggly` : 'Wiggly share page';
    document.title = title;
    const metaTags: Array<[string, string]> = [
      ['og:title', sharePageRecord?.headline || 'Wiggly ad'],
      ['og:description', sharePageRecord?.subhead || 'A visual ad made with Wiggly.'],
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', sharePageRecord?.headline || 'Wiggly ad'],
      ['twitter:description', sharePageRecord?.subhead || 'A visual ad made with Wiggly.'],
    ];
    metaTags.forEach(([property, content]) => {
      const selector = property.startsWith('twitter:') ? `meta[name="${property}"]` : `meta[property="${property}"]`;
      let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        if (property.startsWith('twitter:')) {
          tag.name = property;
        } else {
          tag.setAttribute('property', property);
        }
        document.head.appendChild(tag);
      }
      tag.content = content;
    });
  }, [appRoute, sharePageRecord]);

  if (isMobileViewport && appRoute !== 'share') {
    return <MobileComputerGate />;
  }

  if (appRoute === 'create' || appRoute === 'builder') {
    return (
      <CreatePage
        appRoute={appRoute}
        onRouteChange={handleCreateRouteChange}
        onOpenHome={openHomepage}
      />
    );
  }

  if (appRoute === 'share') {
    return (
      <ShareAdPage
        record={sharePageRecord}
        loading={sharePageLoading}
        onOpenBuilder={enterStudio}
      />
    );
  }

  if (showHomepage) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] font-sans text-slate-950">
        <header className="flex h-16 items-center justify-between bg-[#FBF7EF] px-6 md:px-10">
          <div className="flex items-center gap-3">
            <img src="/wiggly-logo.svg" alt="Wiggly" className="h-9 w-9 rounded-xl object-cover shadow-sm shadow-slate-950/10" />
            <p className="text-xl font-black leading-none tracking-normal text-slate-950">Wiggly</p>
          </div>
          <button
            type="button"
            onClick={enterStudio}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Open Studio
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <div className="relative grid min-h-[calc(100vh-120px)] items-center gap-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-2xl shadow-slate-900/8 md:grid-cols-[0.9fr_1.1fr] md:px-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(0,255,204,0.28),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(79,70,229,0.13),transparent_30%),linear-gradient(180deg,rgba(246,248,251,0),rgba(246,248,251,0.92))]" />
            <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#00FFCC]/20 blur-3xl" />
            <section className="max-w-xl">
              <div className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur">
                <AudioLines className="h-4 w-4 text-[#00FFCC]" />
                Simple video ads for service businesses
              </div>
              <h1 className="relative text-5xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-7xl">
                Drop in your website and watch the magic happen.
              </h1>
              <p className="relative mt-6 max-w-lg text-lg font-medium leading-8 text-slate-600">
                Start with a ready-made design, add your message or voice recording, preview how it looks on Facebook, Instagram, or YouTube, then download the finished ad.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-base font-black text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Make an ad
                  <Wand2 className="h-5 w-5" />
                </button>
              </div>
            </section>

            <section className="relative flex gap-4 overflow-x-auto pb-4 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:block md:min-h-[560px] md:overflow-visible md:pb-0 md:pt-0">
              <div className="w-[172px] shrink-0 rotate-[-3deg] snap-center sm:w-[210px] md:absolute md:left-[8%] md:top-[8%] md:w-[36%] md:rotate-[-5deg]">
                <HomeAdCard headline="One lunch break can cost a $3,200 case." />
              </div>
              <div className="w-[172px] shrink-0 rotate-[2deg] snap-center sm:w-[210px] md:absolute md:left-[36%] md:top-0 md:w-[38%] md:rotate-[3deg]">
                <HomeAdCard headline="You don't need more leads. You need answered calls." background="#FFFFFF" accent="#4F46E5" />
              </div>
              <div className="w-[172px] shrink-0 rotate-[3deg] snap-center sm:w-[210px] md:absolute md:bottom-[4%] md:right-[4%] md:w-[36%] md:rotate-[6deg]">
                <HomeAdCard headline="Every voicemail is a patient choosing someone else." background="#080B16" accent="#6D5BFF" dark />
              </div>
              <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:absolute md:bottom-[12%] md:left-[18%] md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FFCC]/15">
                    <AudioLines className="h-5 w-5 text-[#00BFA5]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Headline + audio + button</p>
                    <p className="text-xs font-semibold text-slate-500">A simple ad layout you can reuse.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="pb-16 pt-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">Built for busy marketers</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                Make the ad. Change the words. Ship the video.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Wand2,
                  title: 'New headline ideas',
                  copy: 'Click once to try a different headline when you are stuck.',
                },
                {
                  icon: AudioLines,
                  title: 'Audio that looks alive',
                  copy: 'Turn a voice recording into moving bars, captions, and a clean ad layout.',
                },
                {
                  icon: CheckCircle2,
                  title: 'See each placement',
                  copy: 'Preview the ad in Facebook feed, Instagram feed, reels, stories, and YouTube.',
                },
                {
                  icon: BookmarkPlus,
                  title: 'Reuse good designs',
                  copy: 'Save a layout once, then swap the text and audio for the next ad.',
                },
                {
                  icon: Download,
                  title: 'Download the ad',
                  copy: 'Get a video file you can upload to your ad account.',
                },
                {
                  icon: MousePointerClick,
                  title: 'No design degree needed',
                  copy: 'Everything is already laid out so you can focus on the message.',
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <feature.icon className="mb-5 h-10 w-10 stroke-[2.4] text-slate-950" />
                  <h3 className="text-2xl font-black leading-tight tracking-normal text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{feature.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative py-10 lg:px-10">
            <div className="absolute inset-x-0 top-20 bottom-16 overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl shadow-slate-900/15">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,255,204,0.18),transparent_28%),radial-gradient(circle_at_65%_42%,rgba(79,70,229,0.32),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
              <div className="pointer-events-none absolute left-[28%] top-[12%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative grid min-h-[640px] gap-6 text-white lg:grid-cols-[0.85fr_1.3fr_0.85fr]">
              <div className="self-start rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:-ml-8">
                <p className="mb-5 text-sm font-black uppercase tracking-wide text-white/40">Pick who the ad is for</p>
                {PERSONA_DECKS.map((deck, index) => (
                  <button
                    key={deck.persona}
                    type="button"
                    onClick={() => setActivePersonaDeckIndex(index)}
                    className={`group flex w-full items-center gap-3 border-b border-white/10 py-4 text-left transition last:border-b-0 ${index === activePersonaDeckIndex ? 'text-white' : 'text-white/55 hover:text-white'}`}
                    aria-pressed={index === activePersonaDeckIndex}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black text-slate-950 transition group-hover:scale-105" style={{ backgroundColor: deck.color }}>
                      +
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-black leading-tight">{deck.persona}</span>
                      <span className="block truncate text-sm font-semibold text-white/40">{deck.angle}</span>
                    </span>
                    <Play className={`h-4 w-4 fill-white transition group-hover:text-white ${index === activePersonaDeckIndex ? 'text-white' : 'text-white/45'}`} />
                  </button>
                ))}
              </div>

              <div className="relative hidden min-h-[600px] lg:block">
                {activePersonaDeck.cards.map((card, index) => {
                  const positions = [
                    'left-[1%] top-[11%] w-[39%] rotate-[-7deg]',
                    'left-[30%] top-[20%] w-[40%] rotate-[3deg]',
                    'bottom-[8%] right-[-2%] w-[39%] rotate-[-4deg]',
                  ];
                  return (
                    <div key={`${activePersonaDeck.persona}-${card.headline}`} className={`absolute transition-all duration-300 ${positions[index]}`}>
                      <HomeAdCard headline={card.headline} background={card.background} accent={card.accent} dark={card.dark} />
                    </div>
                  );
                })}
              </div>

              <div className="self-start rounded-3xl border border-white/10 bg-white/[0.72] p-5 text-slate-950 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:-mr-8 lg:mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-black">Wiggly</p>
                  <span className="h-8 w-14 rounded-full bg-[#00C6A6] p-1">
                    <span className="block h-6 w-6 translate-x-6 rounded-full bg-white shadow-sm" />
                  </span>
                </div>
                <div className="mt-5 border-t border-slate-950/10 pt-5">
                  <p className="text-sm font-black uppercase tracking-wide text-slate-400">Audience</p>
                  <p className="mt-2 text-2xl font-black leading-tight">{activePersonaDeck.customer}</p>
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>How urgent?</span>
                      <span>{activePersonaDeck.pain}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-slate-950 ${activePersonaDeck.pain === 'High' ? 'w-4/5' : 'w-3/5'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-500">
                      <span>How fast to test?</span>
                      <span>{activePersonaDeck.speed}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950/10">
                      <div className={`h-2 rounded-full bg-[#4F46E5] ${activePersonaDeck.speed === 'Urgent' ? 'w-full' : activePersonaDeck.speed === 'Steady' ? 'w-2/3' : 'w-11/12'}`} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Start with this audience
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="relative -mt-8 text-center text-sm font-black text-white/35">
              Pick who you are selling to. Wiggly gives you ad ideas to start from.
            </p>
          </section>

          <section className="py-16">
            <div className="mb-12 max-w-4xl">
              <h2 className="text-4xl font-black leading-[0.95] tracking-normal text-slate-950 md:text-6xl">
                The boring ad tasks are handled for you.
              </h2>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-500">
                Choose a design, change the message, check how it looks, and download the version you like.
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Wand2, title: 'Headline ideas' },
                { icon: AudioLines, title: 'Moving audio bars' },
                { icon: Layers, title: 'Reusable layouts' },
                { icon: Captions, title: 'On-screen captions' },
                { icon: Type, title: 'Editable text' },
                { icon: BookmarkPlus, title: 'Saved designs' },
                { icon: CheckCircle2, title: 'Feed, reel, and YouTube previews' },
                { icon: Download, title: 'Finished video downloads' },
              ].map((item) => (
                <div key={item.title} className="group flex flex-col items-center text-center">
                  <item.icon className="mb-5 h-16 w-16 stroke-[2.8] text-slate-950 transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:text-[#4F46E5]" />
                  <h3 className="max-w-[12rem] text-2xl font-black leading-tight tracking-normal text-slate-950">
                    {item.title}
                  </h3>
                </div>
              ))}
            </div>
          </section>

          <section className="relative mb-16 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-900/15 md:px-12 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,255,204,0.22),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(79,70,229,0.32),transparent_34%)]" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-[#00FFCC]">Make more ads faster</p>
                <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-normal md:text-6xl">
                  Make ten versions before lunch.
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                  Start with a saved design, try a different headline, preview the ad, then download the version that feels strongest.
                </p>
                <button
                  type="button"
                  onClick={openCreateFlow}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Open Wiggly
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Headline', 'Lunch break = lost case'],
                    ['Format', 'IG Feed 4:5'],
                    ['Visual', 'Moving audio bars'],
                    ['Download', '30 second video'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.09] p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-white/35">{label}</p>
                      <p className="mt-2 text-lg font-black leading-tight text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-[#00FFCC] p-5 text-slate-950">
                  <p className="text-sm font-black uppercase tracking-wide opacity-60">Current message</p>
                  <p className="mt-2 text-3xl font-black leading-none tracking-normal">Stop losing patients to voicemail.</p>
                  <div className="mt-5 flex h-3 items-center gap-2">
                    <span className="h-3 w-12 rounded-full bg-slate-950" />
                    <span className="h-3 w-7 rounded-full bg-[#4F46E5]" />
                    <span className="h-3 w-16 rounded-full bg-slate-950" />
                    <span className="h-3 w-9 rounded-full bg-[#4F46E5]" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative overflow-hidden px-6 pb-10 md:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-slate-200 pt-8 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Wiggly. Visual ads that move fast.</p>
            <button type="button" onClick={enterStudio} className="text-slate-950 transition hover:text-[#4F46E5]">
              Open Studio
            </button>
          </div>
          <div className="pointer-events-none -mb-8 hidden select-none overflow-hidden bg-gradient-to-b from-slate-950/10 to-slate-950/0 bg-clip-text text-center text-[10rem] font-black leading-none text-transparent sm:block md:text-[15rem]">
            Wiggly
          </div>
        </footer>
      </div>
    );
  }

  return <CreatePage appRoute="builder" onRouteChange={handleCreateRouteChange} onOpenHome={openHomepage} />;
}
