"use client"

import Image from "next/image"
import { startTransition, useDeferredValue, useState, useEffect, type ChangeEvent, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChefHat, ShoppingBag, Plus, Search, Trash2, LogOut, User, Flame, Pencil, Dumbbell, Users, Mail, KeyRound, ScanLine, History, PackageOpen, Target } from "lucide-react"
import { useStore } from "@/lib/store"
import { GroceryItem, Recipe } from "@/lib/types"
import { AddRecipeModal } from "@/components/modals/AddRecipeModal"
import { AddGroceryItemModal } from "@/components/modals/AddGroceryItemModal"
import { AuthModal } from "@/components/modals/AuthModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CoachDashboard } from "@/components/CoachDashboard"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MealHistoryPanel, NutritionTargetsDialog, PantryPanel, TodayPanel } from "@/components/LensWorkspace"

const LANDING_PANTRY_PREVIEW = [
  { name: "Chicken breast", status: "Have", tone: "emerald" },
  { name: "Rice + spinach", status: "Have", tone: "emerald" },
  { name: "Greek yogurt", status: "Extra", tone: "amber" },
] as const
const LANDING_TODAY_PREVIEW = [
  { time: "08:20", title: "Overnight oats", note: "520 kcal · 34g protein" },
  { time: "13:10", title: "Chicken rice bowl", note: "690 kcal · 56g protein" },
  { time: "19:30", title: "Salmon grain bowl", note: "Draft ready to review" },
] as const
function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section aria-label="GymFuel overview" className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-start justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-white/90"
          >
            <Dumbbell className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium uppercase tracking-wider">Daily Nutrition, Made Practical</span>
          </motion.div>

          <h2 className="editorial-heading max-w-[10ch] text-5xl font-bold leading-[0.9] tracking-tight text-white md:text-7xl">
            See Your Meal.
            <span className="mt-2 block text-blue-300">Shape Your Next One.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/68 md:text-lg">
            Photograph meals, confirm estimated macros, and turn your groceries into gym-focused recipes.
          </p>

          <div className="mt-8">
            <Button
              size="lg"
              onClick={onSignIn}
              className="glass-button rounded-2xl px-8 py-6 text-base md:text-lg"
            >
              Open GymFuel
            </Button>
          </div>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-4 lg:grid-rows-[minmax(0,1.12fr)_minmax(0,0.88fr)]"
        >
          <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#12161f]">
              <div className="relative min-h-[520px]">
                <Image
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=60"
                  alt="High-protein salmon and grain bowl"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 36vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/36 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">Lens draft · estimate</p>
                  <h3 className="editorial-heading mt-3 max-w-[14ch] text-3xl text-white md:text-4xl">
                    Review the meal before it counts.
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/80">
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 backdrop-blur-md">640 kcal</span>
                    <span className="rounded-full border border-emerald-200/20 bg-emerald-950/35 px-3 py-1.5 text-emerald-100 backdrop-blur-md">42g protein</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[#12161f] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Today timeline</p>
                  <p className="mt-2 text-lg font-medium text-white">What you ate, in one glance</p>
                </div>
                <div className="hidden h-10 min-w-[9rem] items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-white/45 sm:flex">
                  <Search className="h-4 w-4" />
                  <span className="text-sm">Search history…</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {LANDING_TODAY_PREVIEW.map((item) => (
                  <div key={item.time} className="grid gap-2 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 sm:grid-cols-[120px_1fr] sm:items-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/70">{item.time}</p>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-white/50">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#12161f] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Groceries</p>
                  <p className="mt-2 text-lg font-medium text-white">Use what you already have</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                  <PackageOpen className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {LANDING_PANTRY_PREVIEW.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div>
                      <p className="text-sm text-white">{item.name}</p>
                    </div>
                    <Badge
                      className={
                        item.tone === "emerald"
                          ? "bg-emerald-500 text-white border-0"
                          : "bg-amber-500 text-black border-0"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Generated result</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  3 groceries-first recipes · up to 3 extras each
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-14 pb-10">
        <section className="rounded-[2.5rem] border border-white/10 bg-[#11161e] p-7 shadow-[0_24px_80px_rgba(2,6,23,0.24)] md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h4 className="editorial-heading text-3xl font-semibold text-white md:text-4xl">Start with your next meal.</h4>
            </div>
            <Button
              size="lg"
              onClick={onSignIn}
              className="rounded-2xl bg-white px-7 py-6 text-sm font-semibold text-slate-950 shadow-none hover:bg-blue-50 md:text-base"
            >
              Open GymFuel
            </Button>
          </div>
        </section>
      </div>
    </section>
  )
}

function EmptyStateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="border-dashed border-white/20 bg-white/5 py-0">
      <CardHeader className="items-center justify-items-center px-6 py-10 text-center">
        <div className="mb-2 flex size-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {icon}
        </div>
        <CardTitle className="text-xl text-foreground">{title}</CardTitle>
        <CardDescription className="max-w-md text-sm">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent className="pb-10 text-center">{action}</CardContent> : null}
    </Card>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("today")
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [isSignOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [isTargetsOpen, setTargetsOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [groceryToDelete, setGroceryToDelete] = useState<GroceryItem | null>(null)
  const [groceriesView, setGroceriesView] = useState<"ingredients" | "shopping">("ingredients")

  const {
    user,
    isAuthenticated,
    recipes,
    groceryItems,
    loadData,
    loadUser,
    logout,
    setAuthModalOpen,
    setAddRecipeModalOpen,
    deleteRecipe,
    deleteGroceryItem,
    setItemToEdit,
    setAddGroceryModalOpen,
  } = useStore()

  // Load user and data on mount
  useEffect(() => {
    loadUser().then(() => {
      // If not authenticated, load from local storage
      if (!isAuthenticated) {
        loadData()
      }
    })
  }, [loadUser, loadData, isAuthenticated])

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
    recipe.description.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(deferredSearchQuery.toLowerCase()))
  )

  // Calculate expiration status for grocery items
  // Red (urgent): expired or ≤3 days
  // Orange (soon): 4-6 days
  // Green (fresh): >6 days
  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return { status: 'none', days: Infinity }

    // Parse the date string as local time (YYYY-MM-DD format)
    const [year, month, day] = expirationDate.split('-').map(Number)
    const expDate = new Date(year, month - 1, day) // month is 0-indexed
    expDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { status: 'expired', days: diffDays }
    if (diffDays <= 3) return { status: 'urgent', days: diffDays }  // 0-3 days = red
    if (diffDays <= 6) return { status: 'soon', days: diffDays }    // 4-6 days = orange
    return { status: 'fresh', days: diffDays }                       // >6 days = green
  }

  // Handler functions
  const handleSignIn = () => {
    setAuthModalOpen(true)
  }

  const handleLogout = () => {
    logout()
    setSignOutConfirmOpen(false)
  }

  const handleAddRecipe = () => {
    setAddRecipeModalOpen(true)
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleAddGroceryItem = () => {
    setAddGroceryModalOpen(true)
  }

  const handleEditGroceryItem = (item: GroceryItem) => {
    setItemToEdit(item)
    setAddGroceryModalOpen(true)
  }

  const handleConfirmDeleteGrocery = () => {
    if (!groceryToDelete) return
    deleteGroceryItem(groceryToDelete.id)
    setGroceryToDelete(null)
  }

  const handleConfirmDeleteRecipe = async () => {
    if (!recipeToDelete) return
    try {
      await deleteRecipe(recipeToDelete.id)
      setRecipeToDelete(null)
    } catch (error) {
      console.error("Failed to delete recipe:", error)
    }
  }

  const grocerySummary = groceryItems.reduce(
    (acc, item) => {
      const expStatus = getExpirationStatus(item.expirationDate)
      if (expStatus.status === "urgent" || expStatus.status === "expired") acc.urgent += 1
      else if (expStatus.status === "soon") acc.soon += 1
      else if (expStatus.status === "fresh") acc.fresh += 1
      else acc.noExpiry += 1
      return acc
    },
    { urgent: 0, soon: 0, fresh: 0, noExpiry: 0 }
  )
  const urgentGroceryCount = grocerySummary.urgent

  return (
    <div className="dark min-h-screen bg-[#0f1220] text-foreground transition-colors duration-300">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#090b10] via-[#0f131a] to-[#090b10]" />
        <div className="absolute top-[-10%] left-[10%] h-[420px] w-[420px] rounded-full bg-[#c8b48c]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[8%] h-[520px] w-[520px] rounded-full bg-[#8fa3bf]/10 blur-[120px]" />
      </div>

      <nav className="sticky top-0 z-50 pt-3">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-14 rounded-2xl border border-white/10 bg-[#10141b]/88 px-4 md:px-5 backdrop-blur-xl shadow-[0_12px_32px_rgba(2,6,23,0.26)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-blue-300/20 bg-blue-500/18 p-2">
                <Dumbbell className="h-4 w-4 text-blue-100" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">GymFuel</h1>
              {isAuthenticated && (
                <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/20 bg-white/10 text-white/80">
                  Lens
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="rounded-xl h-10 px-2.5 border border-white/15 bg-white/5 hover:bg-white/12 gap-2.5">
                      <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                        <User className="h-3.5 w-3.5" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#11182a]" />
                      </span>
                      <span className="hidden md:flex flex-col items-start leading-none min-w-0">
                        <span className="text-xs font-medium max-w-24 truncate">{user?.username}</span>
                        <span className="text-[10px] text-emerald-300/80 flex items-center gap-1 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Signed in
                        </span>
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 p-2">
                    <DropdownMenuLabel className="p-0">
                      <div className="rounded-xl border border-white/12 bg-white/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Account</p>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider border-blue-300/35 bg-blue-500/20 text-blue-100">
                            {user?.role === "coach" ? "Coach" : "Client"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-500/20">
                            <User className="h-4 w-4 text-blue-200" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                            <p className="text-[11px] text-slate-300 truncate">{user?.full_name || "GymFuel member"}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-200">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                            <span>Signed in on this device</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{user?.email}</span>
                          </div>
                          {user?.client_code && (
                            <div className="flex items-center gap-2 text-xs">
                              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-slate-400">Code</span>
                              <code className="font-mono bg-blue-500/15 text-blue-200 px-2 py-0.5 rounded-md">{user.client_code}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setTargetsOpen(true)}
                      className="text-slate-200 focus:bg-white/8 focus:text-white"
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Profile & targets
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setSignOutConfirmOpen(true)
                      }}
                      className="text-rose-200 focus:text-rose-100 focus:bg-rose-500/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" onClick={handleSignIn} className="glass-button rounded-lg px-4 h-9">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="relative container mx-auto max-w-6xl px-4 pb-28 pt-8 md:pb-20">
        {!isAuthenticated ? (
          <LandingPage onSignIn={handleSignIn} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mobile-app-shell flex flex-col gap-8"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                startTransition(() => setActiveTab(value))
              }}
              className="flex flex-col gap-6 md:gap-8"
            >
              <div className="hidden md:flex py-2">
                <TabsList className="h-auto w-auto inline-flex gap-1.5">
                  <TabsTrigger value="today" className="px-5 py-2 whitespace-nowrap font-medium text-sm min-h-10 md:flex-none">
                    <ScanLine className="h-4 w-4" />
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="history" className="px-5 py-2 whitespace-nowrap font-medium text-sm min-h-10 md:flex-none">
                    <History className="h-4 w-4" />
                    My Meals
                  </TabsTrigger>
                  <TabsTrigger value="groceries" className="px-5 py-2 whitespace-nowrap font-medium text-sm min-h-10 md:flex-none">
                    <PackageOpen className="h-4 w-4" />
                    Groceries
                  </TabsTrigger>
                  <TabsTrigger value="recipes" className="px-6 py-2 whitespace-nowrap font-medium text-sm min-h-10 md:flex-none">
                    <ChefHat className="h-4 w-4" />
                    Recipes
                  </TabsTrigger>
                  {user?.role === 'coach' && (
                    <TabsTrigger value="coach" className="px-6 py-2 whitespace-nowrap font-medium text-sm min-h-10 md:flex-none">
                      <Users className="h-4 w-4" />
                      Clients
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
                <div className="mobile-dock p-1.5">
                  <TabsList
                    className={`w-full h-auto grid ${user?.role === "coach" ? "grid-cols-5" : "grid-cols-4"} gap-1 rounded-xl border-none bg-transparent p-0`}
                  >
                    <TabsTrigger value="today" className="mobile-dock-trigger min-h-[58px] flex-col gap-1 px-1 py-2 text-[11px] font-medium">
                      <ScanLine className="h-4 w-4" />
                      <span className="leading-none">Today</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="mobile-dock-trigger min-h-[58px] flex-col gap-1 px-1 py-2 text-[11px] font-medium">
                      <History className="h-4 w-4" />
                      <span className="leading-none">Meals</span>
                    </TabsTrigger>
                    <TabsTrigger value="groceries" className="mobile-dock-trigger min-h-[58px] flex-col gap-1 px-1 py-2 text-[11px] font-medium">
                      <PackageOpen className="h-4 w-4" />
                      <span className="leading-none">Groceries</span>
                    </TabsTrigger>
                    <TabsTrigger value="recipes" className="mobile-dock-trigger min-h-[58px] flex-col gap-1 px-1 py-2 text-[11px] font-medium">
                      <ChefHat className="h-4 w-4" />
                      <span className="leading-none">Recipes</span>
                    </TabsTrigger>
                    {user?.role === 'coach' && (
                      <TabsTrigger value="coach" className="mobile-dock-trigger min-h-[58px] flex-col gap-1 px-1 py-2 text-[11px] font-medium">
                        <Users className="h-4 w-4" />
                        <span className="leading-none">Clients</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <div className="pointer-events-none mx-auto mt-1 h-1 w-24 rounded-full bg-white/20" />
                </div>
              </div>

              <TabsContent value="today">
                <TodayPanel
                  onEditTargets={() => setTargetsOpen(true)}
                />
              </TabsContent>

              <TabsContent value="history">
                <MealHistoryPanel />
              </TabsContent>

              <TabsContent value="recipes" className="flex flex-col gap-6">
                <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Recipes</h2>
                <div className="glass-card rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row gap-3 border-white/20">
                  <div className="flex-1 min-w-[200px] relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-white/70 transition-colors" />
                    <Input
                      aria-label="Search recipes"
                      placeholder="Search recipes…"
                      className="pl-10 bg-white/5 border-white/15 focus:border-blue-400 text-foreground placeholder:text-muted-foreground transition-all rounded-xl min-h-11"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <Button onClick={handleAddRecipe} className="shrink-0 glass-button rounded-xl border-none min-h-11">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Recipe</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>

                {filteredRecipes.length === 0 ? (
                  <EmptyStateCard
                    icon={<ChefHat className="h-10 w-10 text-muted-foreground" />}
                    title="No recipes yet"
                    description={searchQuery ? "No recipes match your search." : "Start by adding a meal you use often."}
                    action={!searchQuery ? (
                      <Button onClick={handleAddRecipe} className="glass-button rounded-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Recipe
                      </Button>
                    ) : undefined}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRecipes.map((recipe, index) => (
                      <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="glass-card overflow-hidden hover:border-white/18 transition-all cursor-pointer group relative rounded-xl h-full flex flex-col">
                          <div className="image-surface h-40 md:h-32 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 relative overflow-hidden rounded-none border-x-0 border-t-0 border-b border-white/12">
                            {recipe.imageUrl ? (
                              <Image
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                width={800}
                                height={600}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ChefHat className="h-12 w-12 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1220]/50 via-transparent to-transparent z-[1]" />
                            <Badge className="absolute top-3 left-3 z-[3] bg-black/60 backdrop-blur-sm border-none text-white text-xs">
                              {recipe.difficulty}
                            </Badge>
                          </div>

                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-3 right-3 z-[5] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-lg w-9 h-9"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRecipeToDelete(recipe)
                            }}
                            aria-label={`Delete recipe ${recipe.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          <div className="flex flex-1 flex-col p-5">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">{recipe.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
                                {recipe.description || "No description yet."}
                              </p>
                            </div>

                            <div className="mt-auto flex flex-col gap-4">
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1.5 font-mono font-semibold text-blue-300 bg-blue-500/15 px-2.5 py-1 rounded-md">
                                  <Dumbbell className="h-3.5 w-3.5" />
                                  <span>{recipe.nutritionalInfo?.protein || 0}g</span>
                                </div>
                                {(recipe.nutritionalInfo?.calories || 0) > 0 && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Flame className="h-3.5 w-3.5" />
                                    <span>{recipe.nutritionalInfo?.calories}</span>
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groceries" className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Groceries</h2>
                  <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/8 bg-white/[0.025] p-1">
                    <Button size="sm" variant={groceriesView === "ingredients" ? "secondary" : "ghost"} className="rounded-xl" onClick={() => setGroceriesView("ingredients")}>
                      <PackageOpen className="size-3.5" />Ingredients & AI
                    </Button>
                    <Button size="sm" variant={groceriesView === "shopping" ? "secondary" : "ghost"} className="rounded-xl" onClick={() => setGroceriesView("shopping")}>
                      <ShoppingBag className="size-3.5" />Shopping list
                    </Button>
                  </div>
                </div>

                {groceriesView === "ingredients" ? (
                  <PantryPanel showHeading={false} onEditPreferences={() => setTargetsOpen(true)} />
                ) : (
                  <>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      Shopping list
                      <Badge className="bg-cyan-500/20 border border-cyan-300/30 text-cyan-200">{groceryItems.length}</Badge>
                    </h3>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2">
                    <Button onClick={handleAddGroceryItem} className="glass-button rounded-lg border-none flex-1 sm:flex-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  </div>
                </div>

                {groceryItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-red-200/80">Urgent</p>
                      <p className="text-lg font-semibold text-red-100">{grocerySummary.urgent}</p>
                    </div>
                    <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-amber-200/80">Soon</p>
                      <p className="text-lg font-semibold text-amber-100">{grocerySummary.soon}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-200/80">Fresh</p>
                      <p className="text-lg font-semibold text-emerald-100">{grocerySummary.fresh}</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/70">No Expiry</p>
                      <p className="text-lg font-semibold text-white/90">{grocerySummary.noExpiry}</p>
                    </div>
                  </div>
                )}

                {urgentGroceryCount > 0 && (
                  <Alert className="border-red-300/20 bg-red-500/10 text-red-100">
                    <AlertDescription>
                      {urgentGroceryCount} item{urgentGroceryCount === 1 ? "" : "s"} need using soon.
                    </AlertDescription>
                  </Alert>
                )}

                {groceryItems.length === 0 ? (
                  <EmptyStateCard
                    icon={<ShoppingBag className="h-10 w-10 text-muted-foreground" />}
                    title="No groceries yet"
                    description="Add anything you need to buy or use up."
                    action={
                      <Button onClick={handleAddGroceryItem} className="glass-button rounded-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Item
                      </Button>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-2.5">
                      {groceryItems.map((item) => {
                        const expStatus = getExpirationStatus(item.expirationDate)
                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 transition-colors group ${expStatus.status === 'urgent' || expStatus.status === 'expired'
                              ? 'bg-red-500/10 border-red-300/25'
                              : expStatus.status === 'soon'
                                ? 'bg-amber-500/10 border-amber-300/25'
                                : 'bg-white/5 border-white/15 hover:bg-white/10'
                              }`}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-foreground text-base sm:text-lg">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit} • {item.category}
                              </div>
                              {item.expirationDate && (
                                <div
                                  className={`text-sm mt-1 font-medium ${expStatus.status === 'urgent' || expStatus.status === 'expired'
                                    ? 'text-red-500'
                                    : expStatus.status === 'soon'
                                      ? 'text-amber-500'
                                      : 'text-emerald-500'
                                    }`}
                                >
                                  {expStatus.status === 'expired'
                                    ? 'Expired'
                                    : expStatus.days === 0
                                      ? 'Expires today'
                                      : expStatus.days === 1
                                        ? 'Expires tomorrow'
                                        : `Expires in ${expStatus.days} days`}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <Badge
                                className={`rounded-md px-3 py-1 border-none text-xs font-semibold uppercase tracking-wide ${expStatus.status === 'urgent' || expStatus.status === 'expired'
                                  ? 'bg-red-500 text-white'
                                  : expStatus.status === 'soon'
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-emerald-500 text-white'
                                  }`}
                              >
                                {expStatus.status === 'urgent' || expStatus.status === 'expired'
                                  ? 'Urgent'
                                  : expStatus.status === 'soon'
                                    ? 'Soon'
                                    : expStatus.status === 'none'
                                      ? 'No expiry'
                                      : 'Fresh'}
                              </Badge>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-lg"
                                  onClick={() => handleEditGroceryItem(item)}
                                  aria-label={`Edit ${item.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-white/10 rounded-lg"
                                  onClick={() => setGroceryToDelete(item)}
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
                  </>
                )}
              </TabsContent>

              {user?.role === 'coach' && (
                <TabsContent value="coach">
                  <CoachDashboard />
                </TabsContent>
              )}
            </Tabs>
          </motion.div>
        )}
      </main>
      {/* Modals */}
      <AuthModal />
      <AddRecipeModal />
      <AddGroceryItemModal />
      <NutritionTargetsDialog open={isTargetsOpen} onOpenChange={setTargetsOpen} />
      <Dialog open={!!groceryToDelete} onOpenChange={(open) => !open && setGroceryToDelete(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-[#141922]/95">
          <DialogHeader>
            <DialogTitle>Delete Grocery Item?</DialogTitle>
            <DialogDescription>
              {groceryToDelete
                ? `Are you sure you want to remove "${groceryToDelete.name}" from your grocery list?`
                : "Are you sure you want to remove this item?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setGroceryToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteGrocery}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-[#141922]/95">
          <DialogHeader>
            <DialogTitle>Delete Recipe?</DialogTitle>
            <DialogDescription>
              {recipeToDelete
                ? `Are you sure you want to delete "${recipeToDelete.title}"?`
                : "Are you sure you want to delete this recipe?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setRecipeToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteRecipe}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSignOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-[#141922]/95">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? Your data will remain in the cloud.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setSignOutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
