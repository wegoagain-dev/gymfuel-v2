"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { api } from "@/lib/api"
import { ClientSummary, Meal, Recipe } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Users, Trash2, Utensils, ChefHat, Dumbbell } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function CoachDashboard() {
    const { user } = useStore()
    const [clients, setClients] = useState<ClientSummary[]>([])
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
    const [clientToUnlink, setClientToUnlink] = useState<ClientSummary | null>(null)
    const [clientMeals, setClientMeals] = useState<Meal[]>([])
    const [clientRecipes, setClientRecipes] = useState<Recipe[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)

    // Add Client State
    const [addClientEmail, setAddClientEmail] = useState("")
    const [addClientCode, setAddClientCode] = useState("")
    const [isAddingClient, setIsAddingClient] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)
    const [addSuccess, setAddSuccess] = useState<string | null>(null)

    useEffect(() => {
        if (user?.role === "coach") {
            loadClients()
        }
    }, [user])

    const loadClients = async () => {
        setIsLoadingClients(true)
        try {
            const data = await api.getClients()
            setClients(data)
        } catch (error) {
            console.error("Failed to load clients:", error)
        } finally {
            setIsLoadingClients(false)
        }
    }

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddError(null)
        setAddSuccess(null)
        setIsAddingClient(true)

        try {
            await api.linkClient(addClientEmail, addClientCode)
            setAddSuccess("Client linked.")
            setAddClientEmail("")
            setAddClientCode("")
            loadClients()
        } catch (error) {
            setAddError(error instanceof Error ? error.message : "Failed to link client")
        } finally {
            setIsAddingClient(false)
        }
    }

    const handleViewClient = async (client: ClientSummary) => {
        setSelectedClient(client)
        setIsLoadingData(true)
        try {
            const [meals, recipes] = await Promise.all([
                api.getClientMeals(client.id),
                api.getClientRecipes(client.id)
            ])
            setClientMeals(meals)
            setClientRecipes(recipes)
        } catch (error) {
            console.error("Failed to load client data:", error)
        } finally {
            setIsLoadingData(false)
        }
    }

    const handleUnlinkClient = async (clientId: number) => {
        try {
            await api.unlinkClient(clientId)
            loadClients()
            if (selectedClient?.id === clientId) {
                setSelectedClient(null)
                setClientMeals([])
                setClientRecipes([])
            }
        } catch (error) {
            console.error("Failed to unlink client:", error)
        } finally {
            setClientToUnlink(null)
        }
    }

    const getCurrentWeekBounds = () => {
        const now = new Date()
        const start = new Date(now)
        const day = start.getDay() || 7
        start.setDate(start.getDate() - (day - 1))
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return { start, end }
    }

    const getClientWeekSnapshot = () => {
        const { start, end } = getCurrentWeekBounds()
        const weekMeals = clientMeals.filter((meal) => {
            const d = new Date(`${meal.date}T12:00:00`)
            return d >= start && d <= end
        })
        const plannedDays = new Set(weekMeals.map((m) => m.date)).size
        const recipesWithProtein = clientRecipes.filter((r) => (r.nutritionalInfo?.protein || 0) > 0).length
        const coverage = Math.round((plannedDays / 7) * 100)

        return {
            plannedMeals: weekMeals.length,
            plannedDays,
            recipesWithProtein,
            coverage,
        }
    }

    const linkedClientsCount = clients.length
    const selectedClientName = selectedClient?.full_name || selectedClient?.username || "No client selected"

    if (user?.role !== "coach") {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-card rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Coach Access Only</h3>
                <p className="text-muted-foreground">Please sign in as a coach to access this dashboard.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Coach Dashboard</h2>
                    <p className="text-muted-foreground">Manage your clients and see what needs attention.</p>
                </div>
            </div>

            <div className="glass-card rounded-3xl border border-white/15 p-6 md:p-7">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="flex flex-col gap-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Coach overview</p>
                        <h3 className="text-2xl font-semibold text-foreground">Link clients, review the week, and spot gaps early.</h3>
                        <p className="text-sm leading-7 text-muted-foreground">
                            Add clients, check their meal plan for the week, and see who needs a nudge before things start to slip.
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Linked clients</p>
                                <p className="mt-2 text-2xl font-semibold text-white">{linkedClientsCount}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected client</p>
                                <p className="mt-2 text-sm font-medium text-white">{selectedClientName}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Primary task</p>
                                <p className="mt-2 text-sm font-medium text-white">{linkedClientsCount === 0 ? "Link your first client" : "Review this week's plans"}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/70">01</p>
                            <p className="mt-2 text-sm font-medium text-white">Link a client with email and code</p>
                            <p className="mt-1 text-xs leading-6 text-white/50">Keep sign-up quick so you can start planning straight away.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/70">02</p>
                            <p className="mt-2 text-sm font-medium text-white">Review meal coverage and recipe depth</p>
                            <p className="mt-1 text-xs leading-6 text-white/50">See whether the client has enough meals and recipes for the week.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/70">03</p>
                            <p className="mt-2 text-sm font-medium text-white">Tidy things up before the week goes off track</p>
                            <p className="mt-1 text-xs leading-6 text-white/50">Catch empty plans, low variety, or low protein before the client starts guessing.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 md:gap-8">
                <Card className="md:col-span-1 border-white/10 bg-[#141922]/95">
                    <CardHeader>
                        <CardTitle>Link New Client</CardTitle>
                        <CardDescription>Enter the client&apos;s email and unique code.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddClient} className="flex flex-col gap-4">
                            {addError && (
                                <Alert variant="destructive">
                                    <AlertDescription>{addError}</AlertDescription>
                                </Alert>
                            )}
                            {addSuccess && (
                                <Alert className="border-emerald-500 text-emerald-500">
                                    <AlertDescription>{addSuccess}</AlertDescription>
                                </Alert>
                            )}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="client-email">Client Email</Label>
                                <Input
                                    id="client-email"
                                    name="clientEmail"
                                    type="email"
                                    autoComplete="email"
                                    spellCheck={false}
                                    value={addClientEmail}
                                    onChange={(e) => setAddClientEmail(e.target.value)}
                                    placeholder="client@example.com"
                                    required
                                    className="bg-white/5 border-white/15"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="client-code">Unique Client Code</Label>
                                <Input
                                    id="client-code"
                                    name="clientCode"
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={addClientCode}
                                    onChange={(e) => setAddClientCode(e.target.value)}
                                    placeholder="A1B2C3D4…"
                                    required
                                    className="bg-white/5 border-white/15"
                                />
                            </div>
                            <Button className="w-full glass-button" type="submit" disabled={isAddingClient}>
                                {isAddingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Link Client
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1 border-white/10 bg-[#141922]/95">
                    <CardHeader>
                        <CardTitle>My Clients</CardTitle>
                        <CardDescription>Select a client to open their meals and recipes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingClients ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground border border-dashed border-white/15 rounded-lg">
                                <p>No clients linked yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {clients.map((client) => (
                                    <div
                                        key={client.id}
                                        className={`flex items-center gap-3 rounded-xl border p-2 transition-colors ${selectedClient?.id === client.id
                                            ? "bg-white/[0.07] border-white/18"
                                            : "bg-white/[0.03] border-white/10 hover:border-white/18"
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left"
                                            onClick={() => {
                                                handleViewClient(client)
                                                setTimeout(() => {
                                                    document.getElementById('client-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                }, 100)
                                            }}
                                        >
                                            <p className="truncate font-medium text-foreground">{client.full_name || client.username}</p>
                                            <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => setClientToUnlink(client)}
                                            aria-label={`Unlink ${client.full_name || client.username}`}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedClient && (
                <div id="client-details" className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-20">
                    {(() => {
                        const snapshot = getClientWeekSnapshot()
                        return (
                            <div className="glass-card rounded-2xl border border-white/15 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Weekly Snapshot</p>
                                        <p className="text-sm text-foreground">Based on planned meals and saved recipes.</p>
                                    </div>
                                    <div className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider border ${snapshot.coverage >= 70
                                        ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                                        : snapshot.coverage >= 40
                                            ? "border-amber-300/30 bg-amber-500/15 text-amber-100"
                                            : "border-rose-300/30 bg-rose-500/15 text-rose-100"
                                        }`}>
                                        {snapshot.coverage}% day coverage
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Planned Meals</p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{snapshot.plannedMeals}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Days</p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{snapshot.plannedDays}/7</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein Recipes</p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{snapshot.recipesWithProtein}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}

                    <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                        <Utensils className="h-5 w-5 text-blue-300" />
                        Viewing {selectedClient.full_name || selectedClient.username}
                    </h3>

                    {isLoadingData ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                        </div>
                    ) : (
                        <Tabs defaultValue="meals" className="flex flex-col gap-4">
                            <TabsList className="w-full h-auto grid grid-cols-2 gap-1 bg-white/5 border-white/20">
                                <TabsTrigger value="meals" className="mobile-dock-trigger min-h-10 text-xs sm:text-sm">Meal Plan</TabsTrigger>
                                <TabsTrigger value="recipes" className="mobile-dock-trigger min-h-10 text-xs sm:text-sm">Recipes</TabsTrigger>
                            </TabsList>

                            <TabsContent value="meals" className="flex flex-col gap-4">
                                {clientMeals.length === 0 ? (
                                    <div className="text-center p-12 glass-card rounded-xl border-dashed">
                                        <p className="text-muted-foreground">No meals planned yet.</p>
                                        <p className="text-xs text-muted-foreground mt-1">This client needs to add meals to their plan.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-2 md:hidden">
                                            {clientMeals.map((meal) => (
                                                <div key={meal.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{new Date(meal.date).toLocaleDateString()}</p>
                                                        <span className="text-[10px] rounded-md bg-blue-500/20 text-blue-200 px-2 py-0.5 uppercase tracking-wide">{meal.mealType}</span>
                                                    </div>
                                                    <p className="mt-1 text-sm font-medium text-foreground">{meal.recipeName || "Custom Meal"}</p>
                                                    {meal.notes && <p className="mt-1 text-xs text-muted-foreground">{meal.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                        <Card className="hidden md:block border-white/10 bg-[#141922]/95">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-white/15 hover:bg-transparent">
                                                            <TableHead className="w-[100px]">Date</TableHead>
                                                            <TableHead className="min-w-[150px]">Meal</TableHead>
                                                            <TableHead className="min-w-[150px]">Notes</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {clientMeals.map((meal) => (
                                                            <TableRow key={meal.id} className="border-white/15 hover:bg-white/5">
                                                                <TableCell className="font-medium whitespace-nowrap">{new Date(meal.date).toLocaleDateString()}</TableCell>
                                                                <TableCell>{meal.recipeName || "Custom Meal"}</TableCell>
                                                                <TableCell className="text-muted-foreground">{meal.notes || "-"}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="recipes" className="flex flex-col gap-4">
                                {clientRecipes.length === 0 ? (
                                    <div className="text-center p-12 glass-card rounded-xl border-dashed">
                                        <p className="text-muted-foreground">No recipes saved yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {clientRecipes.map((recipe) => (
                                            <Card key={recipe.id} className="border-white/10 bg-[#141922]/95">
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-base">{recipe.title}</CardTitle>
                                                        <div className="flex items-center gap-1 text-xs font-mono text-blue-300">
                                                            <Dumbbell className="h-3 w-3" />
                                                            {recipe.nutritionalInfo?.protein || 0}g
                                                        </div>
                                                    </div>
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {recipe.description || "No description"}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <ChefHat className="h-3 w-3" />
                                                            {recipe.difficulty}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            )}
            <Dialog open={!!clientToUnlink} onOpenChange={(open) => !open && setClientToUnlink(null)}>
                <DialogContent className="max-w-sm border-white/10 bg-[#141922]/95">
                    <DialogHeader>
                        <DialogTitle>Unlink Client?</DialogTitle>
                        <DialogDescription>
                            {clientToUnlink
                                ? `Are you sure you want to unlink ${clientToUnlink.full_name || clientToUnlink.username}?`
                                : "Are you sure you want to unlink this client?"}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="border-white/15" onClick={() => setClientToUnlink(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => clientToUnlink && handleUnlinkClient(clientToUnlink.id)}>
                            Unlink
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
