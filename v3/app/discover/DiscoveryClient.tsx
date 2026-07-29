"use client";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  Search,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  filterDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "@/features/discovery/catalog";
import { DiscoveryAudioArtwork } from "@/features/discovery/DiscoveryAudioArtwork";
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
const ownerTokenStorageKey = "wiggly-owner-access-token";

export function DiscoveryClient({
  entries,
  savedOnly = false,
}: {
  entries: DiscoveryEntry[];
  savedOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<DiscoveryGoal>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [curationMode, setCurationMode] = useState(false);
  const [toast, setToast] = useState("");
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const audioRefs = useRef(new Map<string, HTMLAudioElement>());
  const shelfRefs = useRef(new Map<string, HTMLDivElement>());
  const hoveredMediaId = useRef<string | null>(null);
  const hiddenEntryIds = useQuery(api.discoveryModeration.listHidden, {}) || [];
  const hideDiscoveryEntry = useMutation(api.discoveryModeration.hide);

  useEffect(() => {
    setSavedIds(readSavedDiscoveryIds(window.localStorage));
    setSoundOn(window.sessionStorage.getItem(soundStorageKey) === "on");
    setCurationMode(new URLSearchParams(window.location.search).get("curate") === "1");
  }, []);

  const visibleEntries = useMemo(() => {
    const filtered = filterDiscoveryEntries(entries, query, goal);
    const hidden = new Set(hiddenEntryIds);
    const publicEntries = filtered.filter((entry) => !hidden.has(entry.id));
    return savedOnly ? publicEntries.filter((entry) => savedIds.has(entry.id)) : publicEntries;
  }, [entries, goal, hiddenEntryIds, query, savedIds, savedOnly]);

  const visibleVideoIds = useMemo(
    () => visibleEntries.filter((entry) => entry.media.kind === "video").map((entry) => entry.id),
    [visibleEntries],
  );
  const visibleShelves = useMemo(
    () => groupDiscoveryEntriesByShelf(visibleEntries),
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
      if (!hoveredMediaId.current && next && next[1] >= 0.55) setActiveVideoId(next[0]);
    }, { threshold: [0, 0.35, 0.55, 0.8] });

    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [visibleVideoIds]);

  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const shouldPlay = !activeAudioId && id === activeVideoId;
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
  }, [activeAudioId, activeVideoId, soundOn, visibleVideoIds]);

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

  const playAudio = (id: string, audio: HTMLAudioElement) => {
    audioRefs.current.forEach((candidate, candidateId) => {
      if (candidateId !== id) candidate.pause();
    });
    videoRefs.current.forEach((video) => video.pause());
    audio.muted = false;
    setSoundOn(true);
    setActiveAudioId(id);
    window.sessionStorage.setItem(soundStorageKey, "on");
    void audio.play();
  };

  const toggleSound = (entry: DiscoveryEntry) => {
    if (entry.media.kind === "audio") {
      const audio = audioRefs.current.get(entry.id);
      if (!audio) return;
      if (audio.paused) {
        playAudio(entry.id, audio);
        return;
      }
      audio.muted = !audio.muted;
      setSoundOn(!audio.muted);
      window.sessionStorage.setItem(soundStorageKey, audio.muted ? "off" : "on");
      return;
    }

    const id = entry.id;
    const nextSoundOn = !(soundOn && activeVideoId === id);
    audioRefs.current.forEach((audio) => audio.pause());
    setActiveAudioId(null);
    setActiveVideoId(id);
    setSoundOn(nextSoundOn);
    window.sessionStorage.setItem(soundStorageKey, nextSoundOn ? "on" : "off");
  };

  const togglePlayback = (entry: DiscoveryEntry) => {
    if (entry.media.kind === "audio") {
      const audio = audioRefs.current.get(entry.id);
      if (!audio) return;
      if (audio.paused) {
        playAudio(entry.id, audio);
      } else {
        audio.pause();
        setSoundOn(false);
        window.sessionStorage.setItem(soundStorageKey, "off");
      }
      return;
    }

    const video = videoRefs.current.get(entry.id);
    if (!video) return;
    audioRefs.current.forEach((audio) => audio.pause());
    setActiveAudioId(null);
    setActiveVideoId(entry.id);
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const previewMedia = (entry: DiscoveryEntry) => {
    if (entry.media.kind === "image") return;
    hoveredMediaId.current = entry.id;
    if (entry.media.kind === "audio") {
      const audio = audioRefs.current.get(entry.id);
      if (audio) playAudio(entry.id, audio);
      return;
    }
    if (entry.media.kind !== "video") return;

    audioRefs.current.forEach((audio) => audio.pause());
    setActiveAudioId(null);
    setActiveVideoId(entry.id);
    setSoundOn(false);
    window.sessionStorage.setItem(soundStorageKey, "off");

    const video = videoRefs.current.get(entry.id);
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  };

  const stopMediaPreview = (entry: DiscoveryEntry) => {
    if (entry.media.kind === "image") return;
    hoveredMediaId.current = null;
    if (entry.media.kind === "audio") {
      audioRefs.current.get(entry.id)?.pause();
      setActiveAudioId((current) => current === entry.id ? null : current);
      setSoundOn(false);
      window.sessionStorage.setItem(soundStorageKey, "off");
    } else if (entry.media.kind === "video") {
      videoRefs.current.get(entry.id)?.pause();
    }
    setActiveVideoId(visibleVideoIds[0] || null);
  };

  const hideEntry = async (entry: DiscoveryEntry) => {
    let accessToken = window.sessionStorage.getItem(ownerTokenStorageKey) || "";
    if (!accessToken) {
      accessToken = window.prompt("Enter your Wiggly owner key")?.trim() || "";
      if (!accessToken) return;
    }
    if (!window.confirm(`Hide "${entry.title}" from Discovery?`)) return;

    try {
      await hideDiscoveryEntry({ accessToken, entryId: entry.id });
      window.sessionStorage.setItem(ownerTokenStorageKey, accessToken);
      setToast("Hidden from Discovery");
    } catch {
      window.sessionStorage.removeItem(ownerTokenStorageKey);
      setToast("Owner key was not accepted");
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

  const scrollShelf = (shelfId: string, direction: -1 | 1) => {
    const shelf = shelfRefs.current.get(shelfId);
    if (!shelf) return;
    shelf.scrollBy({
      left: direction * Math.max(280, shelf.clientWidth * 0.8),
      behavior: "smooth",
    });
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
            <Link href="/submit" className={styles.headerButton}>
              Submit
            </Link>
            <Link
              href={savedOnly ? "/discover" : "/saved"}
              className={`${styles.headerButton} ${savedOnly ? styles.headerButtonActive : ""}`}
            >
              <Bookmark aria-hidden="true" />
              {savedOnly ? "Browse" : "Saved"} {savedIds.size > 0 ? `(${savedIds.size})` : ""}
            </Link>
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
          <h1>{savedOnly ? "The ads you kept." : "Ads worth stealing."}</h1>
        </div>
        <div className={styles.heroCopy}>
          <strong>{savedOnly ? "Your private short list." : "See it. Trust it. Make yours."}</strong>
          <p>
            {savedOnly
              ? "Saved in this browser so you can come back to the work worth studying."
              : "Every finished ad points to the exact creative recipe behind it."}
          </p>
        </div>
      </section>

      <nav className={styles.filters} aria-label="Filter finished ads">
        {goalFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={goal === filter.id && !savedOnly ? styles.activeFilter : ""}
            aria-pressed={goal === filter.id && !savedOnly}
            onClick={() => setGoal(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      <section className={styles.feedBand} aria-labelledby="discovery-feed-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>{savedOnly ? "Private to you" : "Curated by Wiggly"}</p>
            <h2 id="discovery-feed-title">{savedOnly ? "Saved ads" : "Find your next format"}</h2>
          </div>
          <p>
            {savedOnly
              ? "The work you kept for later."
              : "Browse finished work by the kind of ad you want to make."}
          </p>
        </div>

        {visibleEntries.length > 0 ? (
          <div className={styles.shelves}>
            {visibleShelves.map((shelf) => (
              <section
                className={styles.shelf}
                key={shelf.id}
                aria-labelledby={`shelf-${shelf.id}`}
              >
                <div className={styles.shelfHeading}>
                  <div>
                    <h3 id={`shelf-${shelf.id}`}>{shelf.title}</h3>
                    <p>{shelf.description}</p>
                  </div>
                  <div className={styles.shelfControls}>
                    <span>{shelf.entries.length} ads</span>
                    <button
                      type="button"
                      onClick={() => scrollShelf(shelf.id, -1)}
                      aria-label={`Scroll ${shelf.title} left`}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollShelf(shelf.id, 1)}
                      aria-label={`Scroll ${shelf.title} right`}
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div
                  className={styles.shelfTrack}
                  ref={(track) => {
                    if (track) shelfRefs.current.set(shelf.id, track);
                    else shelfRefs.current.delete(shelf.id);
                  }}
                >
                  {shelf.entries.map((entry) => {
                    const saved = savedIds.has(entry.id);
                    const playing = playingMediaId === entry.id;
                    const audible = soundOn && (
                      entry.media.kind === "audio"
                        ? activeAudioId === entry.id
                        : !activeAudioId && activeVideoId === entry.id
                    );

                    return (
                      <article
                        className={styles.card}
                        id={entry.id}
                        key={entry.id}
                        onMouseEnter={() => previewMedia(entry)}
                        onMouseLeave={() => stopMediaPreview(entry)}
                      >
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
                              onPlay={() => setPlayingMediaId(entry.id)}
                              onPause={() => setPlayingMediaId((current) => current === entry.id ? null : current)}
                            />
                          ) : entry.media.kind === "audio" ? (
                            <>
                              <DiscoveryAudioArtwork entry={entry} playing={playing} />
                              <audio
                                ref={(audio) => {
                                  if (audio) audioRefs.current.set(entry.id, audio);
                                  else audioRefs.current.delete(entry.id);
                                }}
                                src={entry.media.src}
                                preload="none"
                                loop
                                onPlay={() => setPlayingMediaId(entry.id)}
                                onPause={() => {
                                  setPlayingMediaId((current) => current === entry.id ? null : current);
                                  setActiveAudioId((current) => current === entry.id ? null : current);
                                }}
                              />
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.media.src} alt={`${entry.brand}: ${entry.title}`} />
                          )}

                          <span className={styles.formatTag}>{entry.format.name}</span>
                          <span className={styles.runtime}>{entry.media.durationLabel}</span>

                          {entry.media.kind !== "image" ? (
                            <div className={styles.mediaControls}>
                              <button
                                type="button"
                                onClick={() => togglePlayback(entry)}
                                aria-label={playing ? `Pause ${entry.title}` : `Play ${entry.title}`}
                                title={playing ? "Pause" : "Play"}
                              >
                                {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSound(entry)}
                                aria-label={audible ? `Mute ${entry.title}` : `Hear ${entry.title}`}
                                title={audible ? "Mute" : "Sound on"}
                              >
                                {audible ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                              </button>
                            </div>
                          ) : null}
                          {curationMode ? (
                            <button
                              type="button"
                              className={styles.curationButton}
                              onClick={() => void hideEntry(entry)}
                              aria-label={`Hide ${entry.title} from Discovery`}
                              title="Hide from Discovery"
                            >
                              <X aria-hidden="true" />
                            </button>
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
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.kicker}>{savedOnly ? "Nothing saved yet" : "No exact match yet"}</p>
            <h2>{savedOnly ? "Keep the ads you want to study." : "Try another goal or search."}</h2>
            <Link href="/discover">
              Browse all finished ads
            </Link>
          </div>
        )}
      </section>

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status">
        {toast}
      </div>
    </main>
  );
}
