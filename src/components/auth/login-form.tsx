"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { useSearchParams } from "next/navigation"
import { login, type AuthFormState } from "@/app/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function LoginForm() {
  const next = useSearchParams().get("next") ?? ""
  const [state, action, pending] = useFormAction<AuthFormState>(login, null)
  return (
    <form onSubmit={action}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        {state && !state.ok && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />} Sign in
        </Button>
      </FieldGroup>
    </form>
  )
}
