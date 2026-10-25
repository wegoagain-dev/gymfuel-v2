import Link from "next/link"
import { ArrowRight, Camera, Flame, PackageOpen, Users } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"

// The loop, in the order food moves through it: kitchen, plate, the day, the coach.
const LOOP = [
  {
    icon: PackageOpen,
    title: "Cook from your kitchen",
    body: "List what you have, pick cut, maintain or bulk, and get three high-protein recipes that use it first.",
  },
  {
    icon: Camera,
    title: "Log with Lens",
    body: "Snap your plate. AI drafts the foods, portions and macros. You review and confirm before anything counts.",
  },
  {
    icon: Flame,
    title: "Today at a glance",
    body: "Calories and protein against targets you set, plus a one-tap “pick a meal for me” when you’re stuck.",
  },
  {
    icon: Users,
    title: "Built for coaches",
    body: "Clients share a private code. Coaches see what was actually eaten against each client’s targets.",
  },
]

/** A real screen from the app, light and dark. The captures carry the app's own 3px rules, so the frame adds none. */
function Screen({ name, alt, width, height, priority, className }: { name: string; alt: string; width: number; height: number; priority?: boolean; className?: string }) {
  return (
    <figure data-slot={name} data-kind="product" className={`overflow-hidden bg-background ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static capture, both modes swap by class */}
      <img src={`/screens/${name}.png`} alt={alt} width={width} height={height} fetchPriority={priority ? "high" : undefined} className="w-full dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static capture, both modes swap by class */}
      <img src={`/screens/${name}-dark.png`} alt={alt} width={width} height={height} loading="lazy" className="hidden w-full dark:block" />
    </figure>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 bg-background">
        <p className="bg-primary py-2 text-center text-sm text-primary-foreground">
          Free while in development.{" "}
          <Link href="/register" className="font-bold underline underline-offset-4 hover:bg-accent hover:text-accent-foreground">
            Create a free account
          </Link>
        </p>
        <div className="border-b-3 border-foreground">
          <div className="page-wrap flex h-16 items-stretch justify-between">
            <Logo />
            <nav className="flex items-stretch" aria-label="Account">
              <Link
                href="/login"
                className="inline-flex items-center border-l-3 border-foreground px-3 text-sm sm:px-5 font-bold whitespace-nowrap hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center border-x-3 border-foreground bg-primary px-3 text-sm sm:px-5 font-bold whitespace-nowrap text-primary-foreground hover:bg-accent hover:text-accent-foreground active:bg-background active:text-foreground"
              >
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero (Stage): the head and the actions on seven columns, the real Lens review on five. */}
        <section className="page-wrap grid min-h-[calc(100svh-6.5rem)] items-center gap-x-16 gap-y-10 py-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-8">
            <h1 className="display max-w-none text-[clamp(3.25rem,6.4vw,6.5rem)] leading-[0.95]">
              See your meal.
              <br />
              Shape your next one.
            </h1>
            <p className="lead max-w-[34ch] text-muted-foreground">
              Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-14 px-7 text-lg" asChild>
                <Link href="/register">
                  Create free account <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-7 text-lg" asChild>
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
          </div>
          <Screen
            name="lens-estimate"
            alt="GymFuel's Confirm meal screen: an AI estimate of chicken breast, jasmine rice and broccoli at 576 kcal and 70 g protein, waiting to be checked and saved"
            width={1344}
            height={1222}
            priority
            className="border-b-3 border-foreground"
          />
        </section>

        {/* The map: one boxed diagram of the loop, each feature a node, ink arrows on the shared rules. */}
        <section aria-labelledby="loop-title" className="border-y-3 border-foreground bg-muted section-pad">
          <div className="page-wrap flex flex-col gap-14">
            <h2 id="loop-title" className="display max-w-[16ch] text-[length:var(--text-section)]">
              Everything between the gym and the kitchen.
            </h2>
            <ol className="cells grid-cols-1 bg-background md:grid-cols-2 xl:grid-cols-4">
              {LOOP.map(({ icon: Icon, title, body }, index) => (
                <li key={title} className="relative flex min-h-80 flex-col gap-4 p-6 lg:p-8">
                  <span className="figure-xl text-8xl" aria-hidden="true">{index + 1}</span>
                  <h3 className="mt-auto flex items-center gap-2 text-2xl font-black">
                    <Icon className="size-6 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    {title}
                  </h3>
                  <p className="text-muted-foreground">{body}</p>
                  {index < LOOP.length - 1 && (
                    <span
                      className="absolute top-10 -right-[22px] z-10 hidden size-10 items-center justify-center bg-primary text-primary-foreground xl:flex"
                      aria-hidden="true"
                    >
                      <ArrowRight className="size-6" strokeWidth={3} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Showcase: a real day from the meal history, across all twelve columns. */}
        <section aria-labelledby="day-title" className="section-pad">
          <div className="page-wrap flex flex-col gap-12">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <h2 id="day-title" className="display text-[length:var(--text-section)]">Every meal you confirm, by the day.</h2>
              <p className="lead text-muted-foreground">Favourite the ones you eat often and log them again in one tap.</p>
            </div>
            <Screen
              name="meals-day"
              alt="GymFuel's meal history for one day: protein shake and banana, chicken rice power bowl and protein overnight oats, each with calories, protein, carbs and fat"
              width={2208}
              height={680}
            />
          </div>
        </section>

        {/* Close: the action again, on the ink band. */}
        <section className="ink-well section-pad-s">
          <div className="page-wrap flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h2 className="display text-[length:var(--text-section)]">Start with your next meal.</h2>
              <p className="mt-4 text-lg">Your photos are never stored.</p>
            </div>
            <Button size="lg" variant="outline" className="h-14 border-background px-7 text-lg" asChild>
              <Link href="/register">Open GymFuel</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer (mast): the wordmark large over the links and the legal line. */}
      <footer className="border-t-3 border-foreground">
        <div className="page-wrap flex flex-col gap-8 pt-16 pb-10">
          <p className="display text-[clamp(4rem,15vw,13rem)] leading-[0.85]" aria-hidden="true">GymFuel</p>
          <div className="flex flex-col gap-4 border-t-3 border-foreground pt-6 text-sm md:flex-row md:items-center md:justify-between">
            <nav aria-label="Footer" className="flex gap-6 font-bold">
              <Link href="/login" className="ink-link">Sign in</Link>
              <Link href="/register" className="ink-link">Create an account</Link>
            </nav>
            <p>© GymFuel</p>
            <p>Nutrition values are estimates, not medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
