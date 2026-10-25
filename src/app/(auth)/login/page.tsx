import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="display text-5xl">Welcome back</h1>
        <p className="mt-3 text-muted-foreground">Sign in to log meals and check today&apos;s targets.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        New to GymFuel?{" "}
        <Link href="/register" className="ink-link font-bold">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="bg-muted p-4 text-sm leading-relaxed">
          <p className="font-bold">Local demo accounts</p>
          <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
            <li><code className="text-foreground">alex@gymfuel.test</code> (client, full data)</li>
            <li><code className="text-foreground">coach@gymfuel.test</code> (coach)</li>
            <li>
              <code className="text-foreground">sam@gymfuel.test</code> (unlinked client, code <code className="text-foreground">5A3D9C1E7B2F4A60</code>)
            </li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Password for all: <code>GymFuel123</code>
          </p>
        </div>
      )}
    </div>
  )
}
