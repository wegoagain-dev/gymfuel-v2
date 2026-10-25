import { Logo } from "@/components/app/logo"

// Stage: the form on the left, a photograph printed in the ink on the right, its line on a solid ink block flush to the frame.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col p-6 md:px-10 md:py-8">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
      <div className="relative hidden flex-col border-l-3 border-foreground lg:flex">
        <figure className="slot relative flex-1" data-slot="auth-photo" data-alt="A heap of rubber dumbbells on a gym rack">
          {/* eslint-disable-next-line @next/next/no-img-element -- library photograph from Wikimedia Commons, credited below */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Colorful_pile_of_dumbbells_at_the_gym.jpg/1280px-Colorful_pile_of_dumbbells_at_the_gym.jpg"
            srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Colorful_pile_of_dumbbells_at_the_gym.jpg/960px-Colorful_pile_of_dumbbells_at_the_gym.jpg 960w, https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Colorful_pile_of_dumbbells_at_the_gym.jpg/1280px-Colorful_pile_of_dumbbells_at_the_gym.jpg 1280w, https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Colorful_pile_of_dumbbells_at_the_gym.jpg/1920px-Colorful_pile_of_dumbbells_at_the_gym.jpg 1920w"
            sizes="50vw"
            width={8160}
            height={6120}
            alt="A heap of rubber dumbbells on a gym rack"
          />
        </figure>
        <div className="border-t-3 border-foreground bg-primary p-8 text-primary-foreground xl:p-10">
          <p className="display max-w-md text-4xl xl:text-5xl">Log meals, hit protein, use your groceries.</p>
          <footer className="mt-6 text-xs">
            Photographs:{" "}
            <a className="underline underline-offset-2 hover:bg-accent hover:text-accent-foreground" href="https://commons.wikimedia.org/wiki/File:Colorful_pile_of_dumbbells_at_the_gym.jpg">
              Ser Amantio di Nicolao
            </a>{" "}
            (CC BY-SA 4.0, Wikimedia Commons)
          </footer>
        </div>
      </div>
    </div>
  )
}
