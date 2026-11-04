import type { MetadataRoute } from "next"
import { ICON_COLOURS } from "@/lib/app-icon"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymFuel",
    short_name: "GymFuel",
    description: "Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: ICON_COLOURS.paper,
    theme_color: ICON_COLOURS.paper,
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
