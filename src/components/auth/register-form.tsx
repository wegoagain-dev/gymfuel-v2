"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { register, type AuthFormState } from "@/app/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Dumbbell, Users } from "lucide-react"
import { useState } from "react"

export function RegisterForm() {
  const [state, action, pending] = useFormAction<AuthFormState>(register, null)
  const [role, setRole] = useState(state?.values?.role ?? "client")
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const field = (name: string) => ({ "aria-invalid": Boolean(errors[name]) || undefined })

  return (
    <form onSubmit={action}>
      <input type="hidden" name="role" value={role} />
      <FieldGroup>
        {state && !state.ok && !Object.keys(errors).some((key) => ["username", "email", "password", "confirmPassword"].includes(key)) && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel>I am a…</FieldLabel>
          <ToggleGroup type="single" variant="outline" value={role} onValueChange={(value) => value && setRole(value)} className="w-full">
            <ToggleGroupItem value="client" className="flex-1"><Dumbbell /> Gym-goer</ToggleGroupItem>
            <ToggleGroupItem value="coach" className="flex-1"><Users /> Coach</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(errors.fullName) || undefined}>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <Input id="fullName" name="fullName" autoComplete="name" defaultValue={state?.values?.fullName} {...field("fullName")} />
          </Field>
          <Field data-invalid={Boolean(errors.username) || undefined}>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input id="username" name="username" autoComplete="username" required defaultValue={state?.values?.username} {...field("username")} />
            <FieldError>{errors.username}</FieldError>
          </Field>
        </div>
        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} {...field("email")} />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.password) || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="new-password" required {...field("password")} />
          {errors.password ? <FieldError>{errors.password}</FieldError> : <FieldDescription>8+ characters with upper, lower case and a number.</FieldDescription>}
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword) || undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required {...field("confirmPassword")} />
          <FieldError>{errors.confirmPassword}</FieldError>
        </Field>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />} Create account
        </Button>
      </FieldGroup>
    </form>
  )
}
