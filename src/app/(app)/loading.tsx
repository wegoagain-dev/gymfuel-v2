import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 md:gap-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Skeleton className="h-44 rounded-[14px] md:h-52" />
        <Skeleton className="h-44 rounded-[14px] md:h-52" />
        <Skeleton className="h-32 rounded-[14px] md:h-52" />
        <Skeleton className="h-32 rounded-[14px] md:h-52" />
      </div>
      <Skeleton className="h-64 rounded-[14px]" />
    </div>
  )
}
