"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, Copy, LogOut, Target } from "lucide-react"
import { toast } from "sonner"
import { logout } from "@/app/actions/auth"
import { ThemeToggle } from "@/components/app/theme-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initialsOf } from "@/components/coach/initials"
import type { PublicUser } from "@/lib/auth/dal"

export function UserMenu({ user }: { user: PublicUser }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const name = user.fullName || user.username

  const copyCode = async () => {
    await navigator.clipboard.writeText(user.clientCode)
    setCopied(true)
    toast.success("Client code copied")
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 pr-3 pl-1" aria-label="Account menu">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initialsOf(name)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-28 truncate text-sm sm:inline">{user.username}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex flex-col gap-1 py-2">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-foreground">{name}</span>
              <Badge variant="secondary" className="capitalize">{user.role}</Badge>
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          {user.role === "client" && (
            <div className="mx-1 mb-1 border border-foreground bg-muted px-2.5 py-2">
              <p className="text-xs text-muted-foreground">Share this client code with your coach</p>
              <button
                type="button"
                onClick={copyCode}
                className="mt-1 flex w-full items-center justify-between gap-2 font-mono text-sm"
                aria-label="Copy client code"
              >
                {user.clientCode}
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-muted-foreground" />}
              </button>
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Target /> Profile &amp; targets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm">Theme</span>
            <ThemeToggle />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>Your meals and lists stay saved to your account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={logout}>
              <AlertDialogAction type="submit" variant="destructive">Sign out</AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
