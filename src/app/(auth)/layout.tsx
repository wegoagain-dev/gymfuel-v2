import Image from "next/image"
import { Logo } from "@/components/app/logo"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col p-6 md:p-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <Image
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&auto=format&fit=crop&q=70"
          alt="Training in the gym"
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        <p className="absolute inset-x-10 bottom-10 max-w-md text-3xl font-semibold tracking-tight text-white">
          Log meals, hit protein, use your groceries.
        </p>
      </div>
    </div>
  )
}
