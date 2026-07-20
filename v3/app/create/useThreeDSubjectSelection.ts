"use client";

import { useState } from "react";
import type { ProductCatalog } from "@/features/research/types";

export function useThreeDSubjectSelection() {
  const [selectedHandle, setSelectedHandle] = useState("");
  const [needsSpecificPage, setNeedsSpecificPage] = useState(false);
  const [subjectUrl, setSubjectUrl] = useState("");

  return {
    selectedHandle,
    needsSpecificPage,
    subjectUrl,
    clearSpecificPage: () => setNeedsSpecificPage(false),
    reset: () => {
      setSelectedHandle("");
      setNeedsSpecificPage(false);
      setSubjectUrl("");
    },
    requestSpecificPage: (hasCatalog: boolean) => {
      if (hasCatalog) {
        setSelectedHandle("");
        return "This brand page is too broad. Choose a product for the 3D video.";
      }
      setNeedsSpecificPage(true);
      return "This homepage is too broad. Paste one product or feature page for the 3D video.";
    },
    selectHandle: setSelectedHandle,
    setSubjectUrl,
  };
}

export function getThreeDResearchTarget({
  catalog,
  needsSpecificPage,
  selectedHandle,
  subjectUrl,
  websiteUrl,
}: {
  catalog?: ProductCatalog | null;
  needsSpecificPage: boolean;
  selectedHandle: string;
  subjectUrl: string;
  websiteUrl: string;
}) {
  const selectedProduct = catalog?.products.find((product) => product.handle === selectedHandle);
  const url = selectedProduct?.url || (needsSpecificPage ? subjectUrl.trim() : "") || websiteUrl;
  return { url, isRefinement: url !== websiteUrl };
}

export const isThreeDEvidenceGap = (message: string) => (
  /missing_(?:strong_evidence|offer|problem)|weak_visual_evidence|does not contain enough concrete evidence/i.test(message)
);

export function getThreeDBreakdownLoadingLabel(elapsedSeconds: number) {
  if (elapsedSeconds >= 90) return "Still waiting on NVIDIA NIM. Slow, not frozen.";
  if (elapsedSeconds >= 45) return "Checking strict 3D story rules";
  if (elapsedSeconds >= 15) return "Writing 3D story directions";
  return "Finding visual evidence";
}
