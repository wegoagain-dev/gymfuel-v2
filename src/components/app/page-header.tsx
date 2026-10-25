// A screen's head: the title in 900 capitals, sitting on a 3px rule. The `eyebrow` prop (a date or context line)
// prints under the title as plain meta, never as a label above it.
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b-3 border-foreground pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="display max-w-none text-4xl md:text-6xl">{title}</h1>
        {eyebrow && <p className="mt-3 text-sm font-bold">{eyebrow}</p>}
        {description && <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
