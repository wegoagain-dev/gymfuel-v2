"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Unlink } from "lucide-react"
import { toast } from "sonner"
import { unlinkClient } from "@/app/actions/coach"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function UnlinkClientButton({ clientId, name, redirectTo, withLabel }: { clientId: number; name: string; redirectTo?: string; withLabel?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const unlink = () =>
    startTransition(async () => {
      const result = await unlinkClient(clientId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Unlinked ${name}`)
      setOpen(false)
      if (redirectTo) router.push(redirectTo)
    })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={withLabel ? "outline" : "ghost"} size={withLabel ? "default" : "icon"} aria-label={`Unlink ${name}`}>
          <Unlink data-icon={withLabel ? "inline-start" : undefined} />
          {withLabel && "Unlink"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink {name}?</AlertDialogTitle>
          <AlertDialogDescription>You&apos;ll stop seeing their meals. They can share their code again to re-link.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              unlink()
            }}
          >
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
