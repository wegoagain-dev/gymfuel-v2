import type { Metadata } from "next"
import { PackageOpen, ShoppingBasket } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { KitchenPanel } from "@/components/groceries/kitchen-panel"
import { ShoppingList } from "@/components/groceries/shopping-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { aiMode } from "@/lib/ai"
import { requireUser } from "@/lib/auth/dal"
import { getGroceries, getPantry } from "@/lib/data"
import { dayKey, getTimeZone } from "@/lib/time"

export const metadata: Metadata = { title: "Groceries" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function GroceriesPage({ searchParams }: PageProps<"/groceries">) {
  const [user, tz, params] = await Promise.all([requireUser(), getTimeZone(), searchParams])
  const [pantry, groceries] = await Promise.all([getPantry(user), getGroceries(user)])
  const tab = params.tab === "shopping" ? "shopping" : "kitchen"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Groceries" description="Keep track of what's in your kitchen, turn it into meals, and plan the next shop." />
      <Tabs defaultValue={tab} className="gap-6">
        <TabsList className="h-10">
          <TabsTrigger value="kitchen" className="px-4"><PackageOpen /> Kitchen &amp; AI</TabsTrigger>
          <TabsTrigger value="shopping" className="px-4">
            <ShoppingBasket /> Shopping list
            <span className="tabular ml-1 rounded-full bg-muted px-1.5 text-xs">{groceries.filter((item) => !item.checked).length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kitchen">
          <KitchenPanel
            ingredients={pantry.map(({ id, name }) => ({ id, name }))}
            defaultGoal={user.preferences.fitnessGoal ?? "maintain"}
            aiMode={aiMode()}
          />
        </TabsContent>
        <TabsContent value="shopping">
          <ShoppingList
            today={dayKey(tz, new Date())}
            items={groceries.map(({ id, name, quantity, unit, category, expirationDate, checked }) => ({ id, name, quantity, unit, category, expirationDate, checked }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
