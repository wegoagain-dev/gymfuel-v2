import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="display text-[2rem]">Welcome back</h1>
        <p className="text-ink-2">Sign in to log meals and check today&apos;s targets.</p>
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
        <div className="rx-label flex flex-col text-sm">
          <p className="px-4 pt-3 pb-2 font-medium">Local demo accounts</p>
          <ul className="flex flex-col gap-1 px-4 pb-3 text-ink-2">
            <li><code className="rx text-ink">alex@gymfuel.test</code> (client, full data)</li>
            <li><code className="rx text-ink">coach@gymfuel.test</code> (coach)</li>
            <li><code className="rx text-ink">sam@gymfuel.test</code> (unlinked client, code <code className="rx text-ink">5A3D9C1E7B2F4A60</code>)</li>
          </ul>
          <p className="rx-stub px-4 py-2.5 text-ink-2">
            Password for all: <code className="rx text-ink">GymFuel123</code>
          </p>
        </div>
      )}
    </div>
  )
}
