import Image from "next/image"
import Link from "next/link"
import { Camera, ChefHat, Flame, PackageOpen, Users } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: Camera,
    tint: "plastic--thu",
    title: "Log with Lens",
    body: "Snap your plate. AI drafts the foods, portions and macros; you review and confirm before anything counts.",
  },
  {
    icon: Flame,
    tint: "plastic--tue",
    title: "Today at a glance",
    body: "Calories and protein against targets you set, plus a one-tap \u201cpick a meal for me\u201d when you\u2019re stuck.",
  },
  {
    icon: PackageOpen,
    tint: "plastic--fri",
    title: "Cook from your kitchen",
    body: "List what you have, pick cut, maintain or bulk, and get three high-protein recipes that use it first.",
  },
  {
    icon: Users,
    tint: "plastic--sat",
    title: "Built for coaches",
    body: "Clients share a private code. Coaches see what was actually eaten against each client\u2019s targets.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="pt-safe sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="window-light" aria-hidden="true">
            <span style={{ left: "8%", top: "-10%" }} />
            <span style={{ left: "34%", top: "-18%" }} />
            <span style={{ left: "62%", top: "-6%" }} />
            <span style={{ left: "86%", top: "-14%" }} />
          </div>
          <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pt-12 pb-16 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-20">
            <div className="flex flex-col items-start gap-6">
              <h1 className="display max-w-[15ch] text-[2.75rem] md:text-[4rem]">
                See your meal.
                <br />
                Shape your next one.
              </h1>
              <p className="max-w-md text-lg text-ink-2">
                Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/register">Create free account</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">I have an account</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[520px] items-end justify-center gap-4">
              <figure className="w-[56%] shrink-0 overflow-hidden rounded-[28px] shadow-(--shadow-lift)">
                <Image
                  src="/screens/today-phone.png"
                  alt="GymFuel Today screen: protein, calories, carbs and fat as filling compartments"
                  width={780}
                  height={1688}
                  priority
                  sizes="(max-width: 1024px) 56vw, 300px"
                />
              </figure>
              <figure className="mb-10 hidden w-[44%] shrink-0 overflow-hidden rounded-[24px] shadow-(--shadow-lift) min-[420px]:block">
                <Image
                  src="/screens/lens-phone.png"
                  alt="A Lens estimate open for review before it is saved"
                  width={780}
                  height={1688}
                  sizes="(max-width: 1024px) 44vw, 230px"
                />
              </figure>
            </div>
          </div>
        </section>

        <section className="border-t bg-paper-2" aria-labelledby="features">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:px-6 md:py-24">
            <h2 id="features" className="display max-w-xl text-[2rem] md:text-[2.75rem]">Everything between the gym and the kitchen.</h2>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-12">
              {FEATURES.map(({ icon: Icon, tint, title, body }, index) => (
                <li
                  key={title}
                  className={cn(
                    "plastic flex flex-col gap-10 p-6 md:p-8",
                    tint,
                    index === 0 || index === 3 ? "md:col-span-7" : "md:col-span-5"
                  )}
                >
                  <Icon className="size-6 text-ink" aria-hidden="true" />
                  <div className="flex flex-col gap-2">
                    <h3 className="display text-2xl text-ink">{title}</h3>
                    <p className="max-w-md text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-8 text-paper [--color-focus:var(--color-accent-soft)] md:flex-row md:items-center md:p-12">
            <div className="flex flex-col gap-2">
              <h2 className="display text-[2rem] md:text-[2.75rem]">Start with your next meal.</h2>
              <p className="text-signal-soft">Free while in development. Your photos are never stored.</p>
            </div>
            <Button size="lg" asChild>
              <Link href="/register">
                <ChefHat data-icon="inline-start" /> Open GymFuel
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between md:px-6">
          <span>&copy; GymFuel</span>
          <span>Nutrition values are estimates, not medical advice.</span>
        </div>
      </footer>
    </div>
  )
}
