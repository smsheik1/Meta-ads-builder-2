"use client";

import {
  Bookmark,
  ExternalLink,
  Pause,
  Play,
  Search,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterDiscoveryEntries } from "@/features/discovery/catalog";
import {
  readSavedDiscoveryIds,
  writeSavedDiscoveryIds,
} from "@/features/discovery/savedAds";
import type { DiscoveryEntry, DiscoveryGoal } from "@/features/discovery/types";
import styles from "./discovery.module.css";

const goalFilters: Array<{ id: DiscoveryGoal; label: string }> = [
  { id: "all", label: "For you" },
  { id: "sell", label: "Sell a product" },
  { id: "explain", label: "Explain it" },
  { id: "story", label: "Tell a story" },
  { id: "teach", label: "Teach" },
  { id: "entertain", label: "Entertain" },
];

const soundStorageKey = "wiggly-discovery-sound";

export function DiscoveryClient({ entries }: { entries: DiscoveryEntry[] }) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<DiscoveryGoal>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [toast, setToast] = useState("");
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());

  useEffect(() => {
    setSavedIds(readSavedDiscoveryIds(window.localStorage));
    setSoundOn(window.sessionStorage.getItem(soundStorageKey) === "on");
  }, []);

  const visibleEntries = useMemo(() => {
    const filtered = filterDiscoveryEntries(entries, query, goal);
    return savedOnly ? filtered.filter((entry) => savedIds.has(entry.id)) : filtered;
  }, [entries, goal, query, savedIds, savedOnly]);

  const visibleVideoIds = useMemo(
    () => visibleEntries.filter((entry) => entry.media.kind === "video").map((entry) => entry.id),
    [visibleEntries],
  );

  useEffect(() => {
    if (activeVideoId && visibleVideoIds.includes(activeVideoId)) return;
    setActiveVideoId(visibleVideoIds[0] || null);
  }, [activeVideoId, visibleVideoIds]);

  useEffect(() => {
    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver((observed) => {
      observed.forEach((item) => {
        const id = item.target.getAttribute("data-discovery-video");
        if (id) visibility.set(id, item.isIntersecting ? item.intersectionRatio : 0);
      });

      const next = [...visibility.entries()]
        .filter(([id]) => visibleVideoIds.includes(id))
        .sort((left, right) => right[1] - left[1])[0];
      if (next && next[1] >= 0.55) setActiveVideoId(next[0]);
    }, { threshold: [0, 0.35, 0.55, 0.8] });

    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [visibleVideoIds]);

  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const shouldPlay = id === activeVideoId;
      video.muted = !soundOn || !shouldPlay;

      if (!shouldPlay) {
        video.pause();
        return;
      }

      void video.play().catch(() => {
        video.muted = true;
        setSoundOn(false);
        window.sessionStorage.setItem(soundStorageKey, "off");
      });
    });
  }, [activeVideoId, soundOn, visibleVideoIds]);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const toggleSave = (id: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        setToast("Removed from Saved ads");
      } else {
        next.add(id);
        setToast("Saved privately");
      }
      writeSavedDiscoveryIds(window.localStorage, next);
      return next;
    });
  };

  const toggleSound = (id: string) => {
    const nextSoundOn = !(soundOn && activeVideoId === id);
    setActiveVideoId(id);
    setSoundOn(nextSoundOn);
    window.sessionStorage.setItem(soundStorageKey, nextSoundOn ? "on" : "off");
  };

  const togglePlayback = (id: string) => {
    const video = videoRefs.current.get(id);
    if (!video) return;
    setActiveVideoId(id);
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const shareEntry = async (entry: DiscoveryEntry) => {
    const url = `${window.location.origin}/discover#${entry.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: entry.title, text: `Made with ${entry.format.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Ad link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setToast("Could not share this ad");
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brandLink} aria-label="Wiggly home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wiggly-wordmark-3d-crop.png" alt="Wiggly" />
          </Link>

          <label className={styles.search}>
            <Search aria-hidden="true" />
            <span className={styles.srOnly}>Search finished ads</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ads, brands, Formats, creators"
            />
          </label>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.headerButton} ${savedOnly ? styles.headerButtonActive : ""}`}
              onClick={() => setSavedOnly((current) => !current)}
            >
              <Bookmark aria-hidden="true" />
              Saved {savedIds.size > 0 ? `(${savedIds.size})` : ""}
            </button>
            <Link href="/create" className={`${styles.headerButton} ${styles.primaryButton}`}>
              Open Wiggly
              <ExternalLink aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Finished ads. Repeatable Formats.</p>
          <h1>Ads worth stealing.</h1>
        </div>
        <div className={styles.heroCopy}>
          <strong>See it. Trust it. Make yours.</strong>
          <p>Every finished ad points to the exact creative recipe behind it.</p>
        </div>
      </section>

      <nav className={styles.filters} aria-label="Filter finished ads">
        {goalFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={goal === filter.id && !savedOnly ? styles.activeFilter : ""}
            aria-pressed={goal === filter.id && !savedOnly}
            onClick={() => {
              setGoal(filter.id);
              setSavedOnly(false);
            }}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      <section className={styles.feedBand} aria-labelledby="discovery-feed-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>{savedOnly ? "Private to you" : "Curated by Wiggly"}</p>
            <h2 id="discovery-feed-title">{savedOnly ? "Saved ads" : "Worth stealing this week"}</h2>
          </div>
          <p>{savedOnly ? "The work you kept for later." : "Real finished work with a reusable Format attached."}</p>
        </div>

        {visibleEntries.length > 0 ? (
          <div className={styles.grid}>
            {visibleEntries.map((entry) => {
              const saved = savedIds.has(entry.id);
              const playing = playingVideoId === entry.id;
              const audible = soundOn && activeVideoId === entry.id;

              return (
                <article className={styles.card} id={entry.id} key={entry.id}>
                  <div className={styles.mediaWell}>
                    {entry.media.kind === "video" ? (
                      <video
                        ref={(video) => {
                          if (video) videoRefs.current.set(entry.id, video);
                          else videoRefs.current.delete(entry.id);
                        }}
                        data-discovery-video={entry.id}
                        src={entry.media.src}
                        poster={entry.media.poster}
                        muted
                        loop
                        playsInline
                        preload="none"
                        onPlay={() => setPlayingVideoId(entry.id)}
                        onPause={() => setPlayingVideoId((current) => current === entry.id ? null : current)}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.media.src} alt={`${entry.brand}: ${entry.title}`} />
                    )}

                    <span className={styles.formatTag}>{entry.format.name}</span>
                    <span className={styles.runtime}>{entry.media.durationLabel}</span>

                    {entry.media.kind === "video" ? (
                      <div className={styles.mediaControls}>
                        <button
                          type="button"
                          onClick={() => togglePlayback(entry.id)}
                          aria-label={playing ? `Pause ${entry.title}` : `Play ${entry.title}`}
                          title={playing ? "Pause" : "Play"}
                        >
                          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSound(entry.id)}
                          aria-label={audible ? `Mute ${entry.title}` : `Hear ${entry.title}`}
                          title={audible ? "Mute" : "Sound on"}
                        >
                          {audible ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.cardCopy}>
                    <div>
                      <p className={styles.brand}>{entry.brand}</p>
                      <h3>{entry.title}</h3>
                      <p className={styles.metadata}>
                        Made with <strong>{entry.format.name}</strong> · v{entry.format.version}
                        <br />
                        by {entry.format.owner}
                      </p>
                    </div>
                    <p className={styles.curatorNote}>{entry.curatorNote}</p>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={saved ? styles.savedButton : ""}
                        onClick={() => toggleSave(entry.id)}
                      >
                        <Bookmark aria-hidden="true" />
                        {saved ? "Saved" : "Save"}
                      </button>
                      <button type="button" onClick={() => void shareEntry(entry)}>
                        <Share2 aria-hidden="true" />
                        Share
                      </button>
                      <Link href={`/s/${entry.id}`}>
                        Open ad
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.kicker}>{savedOnly ? "Nothing saved yet" : "No exact match yet"}</p>
            <h2>{savedOnly ? "Keep the ads you want to study." : "Try another goal or search."}</h2>
            <button
              type="button"
              onClick={() => {
                setSavedOnly(false);
                setGoal("all");
                setQuery("");
              }}
            >
              Browse all finished ads
            </button>
          </div>
        )}
      </section>

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status">
        {toast}
      </div>
    </main>
  );
}
