import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wiggly",
    short_name: "Wiggly",
    description: "Turn brand websites into ads people actually watch.",
    start_url: "/",
    display: "standalone",
    background_color: "#070A12",
    theme_color: "#6D5CFF",
    icons: [
      {
        src: "/wiggly-app-icon-v1-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/wiggly-app-icon-v1-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
