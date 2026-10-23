"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { useEffect, useRef } from "react"
import { Link2 } from "lucide-react"
import { toast } from "sonner"
import { linkClient, type LinkFormState } from "@/app/actions/coach"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function LinkClientForm() {
  const [state, action, pending] = useFormAction<LinkFormState>(linkClient, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Client linked")
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} onSubmit={action} className="rounded-2xl border bg-card p-5">
      <FieldGroup>
        <div>
          <h2 className="font-semibold">Link a client</h2>
          <p className="mt-1 text-sm text-muted-foreground">They&apos;ll find their code in the account menu.</p>
        </div>
        {state && !state.ok && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
        <Field>
          <FieldLabel htmlFor="client-email">Client email</FieldLabel>
          <Input id="client-email" name="email" type="email" required autoComplete="off" spellCheck={false} placeholder="client@example.com" />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-code">Client code</FieldLabel>
          <Input id="client-code" name="code" required autoComplete="off" spellCheck={false} maxLength={16} placeholder="A1B2C3D4E5F60718" className="font-mono uppercase" />
          <FieldDescription>16 characters, letters A–F and numbers.</FieldDescription>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : <Link2 data-icon="inline-start" />} Link client
        </Button>
      </FieldGroup>
    </form>
  )
}
