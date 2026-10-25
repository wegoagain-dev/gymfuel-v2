import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
      </div>
      <Skeleton className="h-64 rounded-none" />
    </div>
  )
}
