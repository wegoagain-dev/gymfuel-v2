import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const editorialFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-editorial",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "GymFuel",
  description: "Meal-photo logging, daily nutrition tracking, groceries-first recipes, and weekly planning for gym-goers",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${headingFont.variable} ${editorialFont.variable} ${monoFont.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
