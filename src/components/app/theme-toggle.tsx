"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={theme ?? "system"}
      onValueChange={(value) => value && setTheme(value)}
      aria-label="Colour theme"
    >
      <ToggleGroupItem value="light" aria-label="Light"><Sun /></ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark"><Moon /></ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System"><Monitor /></ToggleGroupItem>
    </ToggleGroup>
  )
}
