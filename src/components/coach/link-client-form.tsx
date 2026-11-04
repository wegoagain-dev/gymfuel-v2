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
    <form ref={formRef} onSubmit={action} className="tray flex flex-col gap-5 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="display text-xl">Link a client</h2>
        <p className="text-sm text-muted-foreground">They&apos;ll find their code in the account menu.</p>
      </div>
      <FieldGroup className="gap-4">
        {state && !state.ok && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
        <Field>
          <FieldLabel htmlFor="client-email">Client email</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="client@example.com"
            className="focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-code">Client code</FieldLabel>
          <Input
            id="client-code"
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            maxLength={16}
            placeholder="A1B2C3D4E5F60718"
            className="rx focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal"
          />
          <FieldDescription>16 characters, letters A to F and numbers.</FieldDescription>
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : <Link2 data-icon="inline-start" />} Link client
        </Button>
      </FieldGroup>
    </form>
  )
}