import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to log meals and check today&apos;s targets.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        New to GymFuel?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Local demo accounts</p>
          <p className="mt-1">
            <code>alex@gymfuel.test</code> (client, full data) · <code>coach@gymfuel.test</code> (coach) ·{" "}
            <code>sam@gymfuel.test</code> (unlinked client, code <code>5A3D9C1E7B2F4A60</code>)
          </p>
          <p className="mt-1">
            Password for all: <code>GymFuel123</code>
          </p>
        </div>
      )}
    </div>
  )
}
