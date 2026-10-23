import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function NotFound() {
  return (
    <Empty className="min-h-[60svh]">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Compass /></EmptyMedia>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>It may have been deleted, or you don&apos;t have access to it.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild><Link href="/today">Back to Today</Link></Button>
      </EmptyContent>
    </Empty>
  )
}
