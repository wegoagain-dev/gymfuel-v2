import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { initialsOf } from "@/components/coach/initials"
import { LinkClientForm } from "@/components/coach/link-client-form"
import { UnlinkClientButton } from "@/components/coach/unlink-client-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { requireCoach } from "@/lib/auth/dal"
import { weekStats, weekSummary } from "@/lib/coach"
import { getClientActivity, getClients } from "@/lib/data"
import { dayRange, getTimeZone } from "@/lib/time"

export const metadata: Metadata = { title: "Clients" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function CoachPage() {
  const [coach, tz] = await Promise.all([requireCoach(), getTimeZone()])
  const clients = await getClients(coach)
  const weekStart = dayRange(tz, new Date(), -6).start
  const rows = await Promise.all(
    clients.map(async (client) => {
      const { logs } = await getClientActivity(client.id, weekStart)
      const days = weekSummary(tz, logs)
      return { client, stats: weekStats(days, client.preferences), today: days[days.length - 1] }
    })
  )
  const needsAttention = rows.filter((row) => row.stats.loggedDays < 4).length

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader title="Clients" description="Link clients with their code, then see what they actually ate against their own targets." />

      <dl className="tray grid grid-cols-[repeat(3,minmax(0,1fr))] divide-x divide-rule overflow-hidden">
        {(
          [
            ["Linked clients", clients.length],
            ["Logged 4+ days", rows.length - needsAttention],
            ["Below 4 days", needsAttention],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col-reverse gap-1 bg-paper-2 px-3 py-4 sm:px-5">
            <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="figure text-2xl text-ink sm:text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:items-start">
        <section aria-labelledby="clients-title" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="clients-title" className="display text-xl">My clients</h2>
            <p className="text-sm text-muted-foreground">Today at a glance. Open a client to see the week.</p>
          </div>

          <div className="surface overflow-hidden">
            {rows.length ? (
              <ul className="divide-y divide-rule">
                {rows.map(({ client, today }) => {
                  const name = client.fullName || client.username
                  return (
                    <li key={client.id} className="flex items-center gap-1 pr-1">
                      <Link
                        href={`/coach/${client.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-[14px] px-3 py-3 transition-colors duration-(--dur-micro) ease-(--ease-out) hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal sm:px-4"
                      >
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-paper-3 text-xs font-medium text-ink-2">{initialsOf(name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate font-medium">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {today.meals ? `${today.meals} ${today.meals === 1 ? "meal" : "meals"} today` : "No meals today"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                          <span className="rx text-xs text-ink">{today.calories.toLocaleString("en-GB")} kcal</span>
                          <span className="rx text-xs text-muted-foreground">{Math.round(today.protein)} g protein</span>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                      <UnlinkClientButton clientId={client.id} name={name} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Empty className="p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Users /></EmptyMedia>
                  <EmptyTitle>No clients yet</EmptyTitle>
                  <EmptyDescription>Ask a client for their email and the client code in their account menu.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </section>

        <div className="lg:sticky lg:top-24">
          <LinkClientForm />
        </div>
      </div>
    </div>
  )
}
