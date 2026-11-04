import type { Metadata, Viewport } from "next"
import { DM_Mono, Instrument_Sans, Schibsted_Grotesk } from "next/font/google"
import { ThemeProvider } from "@/components/app/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"], weight: ["700"], display: "swap" })
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500"], display: "swap" })
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" })

export const metadata: Metadata = {
  title: { default: "GymFuel. Log meals, hit protein, use your groceries", template: "%s · GymFuel" },
  description: "Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.",
  applicationName: "GymFuel",
  appleWebApp: { capable: true, title: "GymFuel", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#060d0a" },
  ],
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${schibsted.variable} ${instrument.variable} ${dmMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
