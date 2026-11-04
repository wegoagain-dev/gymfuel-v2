import Image from "next/image"
import { Logo } from "@/components/app/logo"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col p-5 pt-[max(env(safe-area-inset-top),1.25rem)] md:p-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden p-4 lg:block">
        <figure className="slot relative flex h-full flex-col overflow-hidden rounded-3xl" data-slot="auth-photo">
          <Image
            src="/photos/dumbbell-grip.jpg"
            alt="A hand gripping a dumbbell beside a bench"
            width={1280}
            height={1917}
            sizes="50vw"
            className="object-cover"
          />
          <figcaption data-keep className="plastic plastic--thu absolute inset-x-6 bottom-6 z-10 flex flex-col gap-2 p-6">
            <p className="display max-w-sm text-3xl text-ink">Log meals, hit protein, use your groceries.</p>
            <p data-credits className="text-xs text-ink-2">
              Photograph:{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Close-up_Hand_holding_dumbbell_in_gym.jpg" className="underline underline-offset-2">
                Nenad Stojkovic
              </a>{" "}
              (CC BY 2.0, Wikimedia Commons)
            </p>
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
