import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Camera, ChefHat, Dumbbell, Flame, PackageOpen, Sparkles, Users } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: Camera,
    title: "Log with Lens",
    body: "Snap your plate. AI drafts the foods, portions and macros — you review and confirm before anything counts.",
  },
  {
    icon: Flame,
    title: "Today at a glance",
    body: "Calories and protein against targets you set, plus a one-tap “pick a meal for me” when you're stuck.",
  },
  {
    icon: PackageOpen,
    title: "Cook from your kitchen",
    body: "List what you have, pick cut, maintain or bulk, and get three high-protein recipes that use it first.",
  },
  {
    icon: Users,
    title: "Built for coaches",
    body: "Clients share a private code. Coaches see what was actually eaten against each client's targets.",
  },
]

const TIMELINE = [
  { time: "08:10", title: "Protein overnight oats", note: "520 kcal · 42 g protein" },
  { time: "13:05", title: "Chicken rice power bowl", note: "690 kcal · 56 g protein" },
  { time: "19:20", title: "Salmon grain bowl", note: "Draft ready to review" },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
              <Dumbbell className="size-3.5" /> Daily nutrition, made practical
            </Badge>
            <h1 className="text-5xl font-semibold tracking-tight text-balance md:text-6xl">
              See your meal.
              <span className="block text-primary">Shape your next one.</span>
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-11 px-5 text-base" asChild>
                <Link href="/register">
                  Create free account <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-5 text-base" asChild>
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3.4] overflow-hidden rounded-3xl border shadow-2xl shadow-primary/10">
              <Image
                src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1400&auto=format&fit=crop&q=70"
                alt="A salmon and grain bowl"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 top-0 p-6 text-white">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/70 uppercase">
                  <Sparkles className="size-3.5" /> Lens draft · estimate
                </p>
                <p className="mt-2 max-w-xs text-2xl font-semibold">Review the meal before it counts.</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">640 kcal</span>
                  <span className="rounded-full bg-emerald-400/25 px-3 py-1 text-emerald-50 backdrop-blur">46 g protein</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">48 g carbs</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-4 hidden w-72 rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur sm:block md:-left-8">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Today</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {TIMELINE.map((item) => (
                  <li key={item.time} className="flex items-start gap-3">
                    <span className="tabular mt-0.5 text-xs text-muted-foreground">{item.time}</span>
                    <span>
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight">Everything between the gym and the kitchen.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border bg-card p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-foreground p-8 text-background md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Start with your next meal.</h2>
              <p className="mt-2 text-background/70">Free while in development. Your photos are never stored.</p>
            </div>
            <Button size="lg" variant="secondary" className="h-11 px-5 text-base" asChild>
              <Link href="/register">
                <ChefHat data-icon="inline-start" /> Open GymFuel
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between md:px-6">
          <span>© GymFuel</span>
          <span>Nutrition values are estimates, not medical advice.</span>
        </div>
      </footer>
    </div>
  )
}
