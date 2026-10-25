import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { initialsOf } from "@/components/coach/initials"
import { LinkClientForm } from "@/components/coach/link-client-form"
import { UnlinkClientButton } from "@/components/coach/unlink-client-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { requireCoach } from "@/lib/auth/dal"
import { weekStats, weekSummary } from "@/lib/coach"
import { getClientActivity, getClients } from "@/lib/data"
import { dayRange, getTimeZone } from "@/lib/time"
import { cn } from "@/lib/utils"

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
      return { client, stats: weekStats(weekSummary(tz, logs), client.preferences) }
    })
  )
  const needsAttention = rows.filter((row) => row.stats.loggedDays < 4).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Clients" description="Link clients with their code, then see what they actually ate against their own targets." />

      <dl className="cells grid-cols-3">
        {(
          [
            ["Linked clients", clients.length],
            ["Logged 4+ days this week", rows.length - needsAttention],
            ["Need a nudge", needsAttention],
          ] as const
        ).map(([label, value], index) => (
          <div key={label} className={cn("flex flex-col-reverse gap-2 p-4 md:p-5", index === 2 && value > 0 && "bg-primary text-primary-foreground")}>
            <dt className="text-sm">{label}</dt>
            <dd className="figure-xl text-5xl md:text-7xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="cells grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <LinkClientForm />

        <section aria-labelledby="clients-title" className="bg-card">
          <h2 id="clients-title" className="display border-b-3 border-foreground px-5 py-4 text-2xl">My clients</h2>
          {rows.length ? (
            <ul className="divide-y divide-foreground">
              {rows.map(({ client, stats }) => {
                const name = client.fullName || client.username
                return (
                  <li key={client.id} className="flex items-center gap-2 pr-3">
                    <Link href={`/coach/${client.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3.5 hover:bg-accent hover:text-accent-foreground active:bg-primary active:text-primary-foreground">
                      <Avatar><AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initialsOf(name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{name}</p>
                        <p className="tabular flex flex-wrap gap-x-4 text-sm">
                          <span>{stats.loggedDays}/7 days logged</span>
                          <span>
                            avg {stats.avgProtein} g protein
                            {client.preferences.dailyProteinTarget ? ` of ${client.preferences.dailyProteinTarget} g` : ""}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant={stats.loggedDays >= 5 ? "default" : "secondary"}
                        className={cn("tabular", stats.loggedDays < 3 && "border-dashed")}
                      >
                        {Math.round((stats.loggedDays / 7) * 100)}%
                      </Badge>
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                    <UnlinkClientButton clientId={client.id} name={name} />
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>No clients yet</EmptyTitle>
                <EmptyDescription>Ask a client for their email and the client code in their account menu.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </div>
  )
}
