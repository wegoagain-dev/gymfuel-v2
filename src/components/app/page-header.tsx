export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="display text-[2rem] md:text-[2.5rem]">{title}</h1>
        {eyebrow && <time className="text-sm text-muted-foreground">{eyebrow}</time>}
        {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
