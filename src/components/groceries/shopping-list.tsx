"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { useEffect, useOptimistic, useState, useTransition } from "react"
import { AlertTriangle, MoreHorizontal, Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteGroceryItem, saveGroceryItem, setGroceryChecked, type GroceryFormState } from "@/app/actions/groceries"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DrawCheckbox } from "@/components/ui/draw-checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { CATEGORIES, UNITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

type Item = { id: number; name: string; quantity: number; unit: string | null; category: string | null; expirationDate: string | null; checked: boolean }
type Status = "expired" | "urgent" | "soon" | "fresh" | "none"

/** Whole days between two yyyy-mm-dd strings (no time zone involved). */
function daysUntil(today: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

function expiry(today: string, date: string | null): { status: Status; label: string } {
  if (!date) return { status: "none", label: "No expiry" }
  const days = daysUntil(today, date)
  if (days < 0) return { status: "expired", label: days === -1 ? "Expired yesterday" : `Expired ${-days} days ago` }
  const label = days === 0 ? "Expires today" : days === 1 ? "Expires tomorrow" : `Expires in ${days} days`
  // Same thresholds as before: ≤3 days urgent, 4–6 soon, later fresh.
  return { status: days <= 3 ? "urgent" : days <= 6 ? "soon" : "fresh", label }
}

// Urgency prints in ink weight and fill, never in a second hue: urgent is a solid ink tag, soon a yellow fill.
const STATUS_STYLE: Record<Status, { badge: string; text: string; name: string }> = {
  expired: { badge: "bg-primary text-primary-foreground", text: "font-bold text-foreground", name: "Urgent" },
  urgent: { badge: "bg-primary text-primary-foreground", text: "font-bold text-foreground", name: "Urgent" },
  soon: { badge: "bg-accent text-accent-foreground", text: "text-foreground", name: "Soon" },
  fresh: { badge: "bg-background text-foreground", text: "text-muted-foreground", name: "Fresh" },
  none: { badge: "border-muted-foreground bg-background text-muted-foreground", text: "text-muted-foreground", name: "No expiry" },
}

export function ShoppingList({ items, today }: { items: Item[]; today: string }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [, startTransition] = useTransition()
  const [optimistic, applyOptimistic] = useOptimistic(items, (current, change: { id: number; checked?: boolean; removed?: boolean }) =>
    change.removed ? current.filter((item) => item.id !== change.id) : current.map((item) => (item.id === change.id ? { ...item, checked: Boolean(change.checked) } : item))
  )

  const counts = optimistic.reduce(
    (acc, item) => {
      const { status } = expiry(today, item.expirationDate)
      acc[status === "expired" ? "urgent" : status] += 1
      return acc
    },
    { urgent: 0, soon: 0, fresh: 0, none: 0 }
  )

  const toggle = (item: Item, checked: boolean) =>
    startTransition(async () => {
      applyOptimistic({ id: item.id, checked })
      const result = await setGroceryChecked(item.id, checked)
      if (!result.ok) toast.error(result.error)
    })

  const confirmDelete = () => {
    if (!deleting) return
    const item = deleting
    setDeleting(null)
    startTransition(async () => {
      applyOptimistic({ id: item.id, removed: true })
      const result = await deleteGroceryItem(item.id)
      if (result.ok) toast.success(`${item.name} removed`)
      else toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="cells flex-1 grid-cols-4 sm:max-w-xl">
          {(
            [
              ["Urgent", counts.urgent, "bg-primary text-primary-foreground"],
              ["Soon", counts.soon, ""],
              ["Fresh", counts.fresh, ""],
              ["No expiry", counts.none, ""],
            ] as const
          ).map(([label, count, tone]) => (
            <div key={label} className={cn("flex flex-col-reverse px-3 py-2.5", tone)}>
              <dt className="text-sm">{label}</dt>
              <dd className="figure-xl text-4xl">{count}</dd>
            </div>
          ))}
        </dl>
        <Button onClick={() => setEditing("new")}>
          <Plus data-icon="inline-start" /> Add item
        </Button>
      </div>

      {counts.urgent > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{counts.urgent} item{counts.urgent === 1 ? "" : "s"} to use up soon</AlertTitle>
          <AlertDescription>Expired or expiring within 3 days.</AlertDescription>
        </Alert>
      )}

      {optimistic.length ? (
        <ul className="easyui box flex flex-col divide-y divide-foreground bg-card">
          {optimistic.map((item) => {
            const { status, label } = expiry(today, item.expirationDate)
            const style = STATUS_STYLE[status]
            return (
              <li key={item.id} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted", item.checked && "bg-muted")}>
                <DrawCheckbox
                  checked={item.checked}
                  onChange={(event) => toggle(item, event.target.checked)}
                  aria-label={item.checked ? `Mark ${item.name} as still needed` : `Mark ${item.name} as in the basket`}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-bold", item.checked && "text-muted-foreground line-through")}>{item.name}</p>
                  <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    <span><span className="tabular">{item.quantity}</span> {item.unit}</span>
                    <span>{item.category ?? "Other"}</span>
                    {item.expirationDate && <span className={style.text}>{label}</span>}
                  </p>
                </div>
                <Badge variant="secondary" className={cn("hidden sm:inline-flex", style.badge)}>{style.name}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${item.name}`}><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(item)}><Pencil /> Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}><Trash2 /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty className="box bg-muted">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShoppingBasket /></EmptyMedia>
            <EmptyTitle>Your list is empty</EmptyTitle>
            <EmptyDescription>Add anything you need to buy or use up.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setEditing("new")}><Plus data-icon="inline-start" /> Add your first item</Button>
          </EmptyContent>
        </Empty>
      )}

      <GroceryDialog item={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from your shopping list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function GroceryDialog({ item, onClose }: { item: Item | "new" | null; onClose: () => void }) {
  const existing = item && item !== "new" ? item : null
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit item" : "Add to shopping list"}</DialogTitle>
          <DialogDescription>Add an expiry date to get a heads-up before it goes off.</DialogDescription>
        </DialogHeader>
        {item && <GroceryForm key={existing?.id ?? "new"} item={existing} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function GroceryForm({ item, onDone }: { item: Item | null; onDone: () => void }) {
  const [state, action, pending] = useFormAction<GroceryFormState>(saveGroceryItem.bind(null, item?.id ?? null), null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved")
      onDone()
    }
  }, [state, onDone])

  return (
    <form onSubmit={action}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="grocery-name">Item</FieldLabel>
          <Input id="grocery-name" name="name" required maxLength={120} placeholder="e.g. Greek yoghurt" defaultValue={item?.name} aria-invalid={Boolean(errors.name) || undefined} />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(errors.quantity) || undefined}>
            <FieldLabel htmlFor="grocery-quantity">Quantity</FieldLabel>
            <Input id="grocery-quantity" name="quantity" type="number" inputMode="decimal" min="0.01" step="any" required defaultValue={item?.quantity ?? 1} />
            <FieldError>{errors.quantity}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Unit</FieldLabel>
            <Select name="unit" defaultValue={item?.unit ?? "piece"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Category</FieldLabel>
            <Select name="category" defaultValue={item?.category ?? "Other"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field data-invalid={Boolean(errors.expirationDate) || undefined}>
            <FieldLabel htmlFor="grocery-expiry">Expires</FieldLabel>
            <Input id="grocery-expiry" name="expirationDate" type="date" defaultValue={item?.expirationDate ?? ""} />
            <FieldError>{errors.expirationDate}</FieldError>
          </Field>
        </div>
        {state && !state.ok && !Object.keys(errors).length && (
          <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />} {item ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
