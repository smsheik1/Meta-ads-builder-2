"use client";

import { Bookmark, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { readSavedDiscoveryIds, writeSavedDiscoveryIds } from "./savedAds";

export function DiscoveryDetailActions({
  entryId,
  title,
}: {
  entryId: string;
  title: string;
}) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSaved(readSavedDiscoveryIds(window.localStorage).has(entryId));
  }, [entryId]);

  const toggleSaved = () => {
    const ids = readSavedDiscoveryIds(window.localStorage);
    if (ids.has(entryId)) ids.delete(entryId);
    else ids.add(entryId);
    writeSavedDiscoveryIds(window.localStorage, ids);
    setSaved(ids.has(entryId));
    setMessage(ids.has(entryId) ? "Saved privately" : "Removed from Saved ads");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Ad link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not share this ad");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleSaved}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] px-4 text-sm font-black ${
            saved ? "bg-[#c9ff55]" : "bg-white"
          }`}
        >
          <Bookmark className="size-4" aria-hidden="true" />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-[#080817] bg-white px-4 text-sm font-black"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </button>
      </div>
      <p className="mt-2 min-h-5 text-center text-xs font-bold text-[#596176]" role="status">
        {message}
      </p>
    </div>
  );
}
