import { ImageResponse } from "next/og"

// Raster icons can't read CSS variables, so the Dose tokens are resolved to sRGB here:
// --color-accent oklch(50% 0.13 160), --color-accent-deep oklch(42% 0.11 162), --color-accent-ink oklch(99% 0.006 160).
export const ICON_COLOURS = { accent: "#007948", accentDeep: "#005f3a", accentInk: "#f8fdfa", paper: "#faf7ef" }

const DUMBBELL = [
  "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z",
  "m2.5 21.5 1.4-1.4",
  "m20.1 3.9 1.4-1.4",
  "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z",
  "m9.6 14.4 4.8-4.8",
]

/** The GymFuel mark (moulded green tile, dumbbell) as a PNG. `inset` adds paper around it for maskable icons. */
export function appIcon(size: number, { rounded = true, inset = 0 }: { rounded?: boolean; inset?: number } = {}) {
  const tile = size - inset * 2
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: inset ? ICON_COLOURS.accentDeep : "transparent" }}>
        <div
          style={{
            width: tile,
            height: tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: rounded ? tile * 0.24 : 0,
            background: `linear-gradient(${ICON_COLOURS.accent}, ${ICON_COLOURS.accentDeep})`,
          }}
        >
          <svg aria-hidden="true" width={tile * 0.56} height={tile * 0.56} viewBox="0 0 24 24" fill="none" stroke={ICON_COLOURS.accentInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {DUMBBELL.map((d) => <path key={d} d={d} />)}
          </svg>
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
