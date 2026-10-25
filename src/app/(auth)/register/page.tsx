import type { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = { title: "Create account" }

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display text-5xl">Create your account</h1>
        <p className="mt-3 text-muted-foreground">Track meals for yourself, or coach your clients.</p>
      </div>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="ink-link font-bold">
          Sign in
        </Link>
      </p>
    </div>
  )
}
