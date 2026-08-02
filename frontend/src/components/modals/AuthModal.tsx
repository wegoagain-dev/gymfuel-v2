"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dumbbell, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export function AuthModal() {
    const { isAuthModalOpen, setAuthModalOpen, login, register } = useStore()
    const [activeTab, setActiveTab] = useState<"login" | "register">("login")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    })

    const [registerData, setRegisterData] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        role: "client" as "client" | "coach",
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            await login(loginData.email, loginData.password)
            // Modal will close automatically via store
            setLoginData({ email: "", password: "" })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (registerData.password !== registerData.confirmPassword) {
            setError("Passwords don't match")
            return
        }

        if (registerData.password.length < 8) {
            setError("Password must be at least 8 characters with uppercase, lowercase, and number")
            return
        }

        setIsLoading(true)

        try {
            await register({
                email: registerData.email,
                username: registerData.username,
                password: registerData.password,
                full_name: registerData.full_name || undefined,
                role: registerData.role,
            })
            // Modal will close automatically via store
            setRegisterData({
                email: "",
                username: "",
                password: "",
                confirmPassword: "",
                full_name: "",
                role: "client",
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setAuthModalOpen(false)
        setError(null)
        setActiveTab("login")
    }

    return (
        <Dialog open={isAuthModalOpen} onOpenChange={handleClose}>
            <DialogContent className="top-2 sm:top-4 md:top-[50%] translate-y-0 md:translate-y-[-50%] max-w-xl lg:max-w-4xl border-white/20 bg-[#131a2c]/92 p-0 !overflow-x-hidden !overflow-y-hidden rounded-[1.25rem] sm:rounded-[1.8rem] md:rounded-3xl max-h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-2rem)]">
                <div className="grid lg:grid-cols-[0.85fr_1.15fr] lg:max-h-[calc(100dvh-2rem)]">
                    <div className="relative hidden lg:block min-h-[500px] p-4">
                        <div className="image-surface h-full w-full">
                        <img
                            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&auto=format&fit=crop&q=60"
                            alt="Gym training"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/25 via-slate-900/35 to-slate-900/85" />
                        <div className="absolute inset-x-6 bottom-6 space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white/90">
                                <Dumbbell className="h-3.5 w-3.5" />
                                Welcome to GymFuel
                            </div>
                            <p className="text-2xl font-semibold text-white leading-tight">Log meals, hit protein, use your groceries.</p>
                        </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden p-4 sm:p-5 md:p-6 lg:p-7">
                        <div className="pointer-events-none absolute -top-12 right-[-2rem] h-32 w-32 rounded-full bg-blue-500/15 blur-3xl hidden sm:block" />
                        <div className="pointer-events-none absolute -bottom-14 left-[-1rem] h-28 w-28 rounded-full bg-violet-500/15 blur-3xl hidden sm:block" />

                        <DialogHeader className="mb-2 relative z-10">
                            <DialogTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-blue-300" />
                                Access Your Dashboard
                            </DialogTitle>
                            <DialogDescription className="hidden sm:block">
                                Sign in or create an account.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="relative z-10 space-y-0">
                            <TabsList className="grid h-auto w-full grid-cols-2 bg-white/5 border border-white/15 rounded-2xl p-1 overflow-hidden">
                                <TabsTrigger value="login" className="h-10 sm:h-11 min-h-0 rounded-xl text-sm py-0 px-3 leading-none data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-300/30 border border-transparent">
                                    <LogIn className="h-4 w-4" />
                                    Sign In
                                </TabsTrigger>
                                <TabsTrigger value="register" className="h-10 sm:h-11 min-h-0 rounded-xl text-sm py-0 px-3 leading-none data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-300/30 border border-transparent">
                                    <UserPlus className="h-4 w-4" />
                                    Sign Up
                                </TabsTrigger>
                            </TabsList>

                            {error && (
                                <Alert variant="destructive" className="mt-4 border-rose-300/30 bg-rose-500/15 text-rose-100">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <TabsContent value="login" className="mt-2">
                                <form onSubmit={handleLogin} className="space-y-2.5">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-slate-300">Email</Label>
                                        <Input
                                            id="login-email"
                                            type="email"
                                            value={loginData.email}
                                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                            placeholder="you@example.com"
                                            required
                                            disabled={isLoading}
                                            className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-slate-300">Password</Label>
                                        <Input
                                            id="login-password"
                                            type="password"
                                            value={loginData.password}
                                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                            placeholder="••••••••"
                                            required
                                            disabled={isLoading}
                                            className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full rounded-xl min-h-10 sm:min-h-11" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Sign In
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register" className="mt-2">
                                <form onSubmit={handleRegister} className="space-y-2.5">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="register-email" className="text-xs uppercase tracking-wider text-slate-300">Email</Label>
                                            <Input
                                                id="register-email"
                                                type="email"
                                                value={registerData.email}
                                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                                placeholder="you@example.com"
                                                required
                                                disabled={isLoading}
                                                className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="register-username" className="text-xs uppercase tracking-wider text-slate-300">Username</Label>
                                            <Input
                                                id="register-username"
                                                type="text"
                                                value={registerData.username}
                                                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                                                placeholder="johndoe"
                                                required
                                                disabled={isLoading}
                                                className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-slate-300">Role</Label>
                                        <RadioGroup
                                            value={registerData.role}
                                            onValueChange={(val) => setRegisterData({ ...registerData, role: val as "client" | "coach" })}
                                            className="grid grid-cols-2 gap-2"
                                        >
                                            <Label
                                                htmlFor="role-client"
                                                className={cn(
                                                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-2 min-h-10 transition-colors",
                                                    registerData.role === "client"
                                                        ? "border-blue-300/40 bg-blue-500/15 text-blue-100"
                                                        : "border-white/12 bg-white/5 text-slate-200"
                                                )}
                                            >
                                                <RadioGroupItem value="client" id="role-client" className="border-white/45 text-blue-300" />
                                                <span className="text-xs font-medium">Client</span>
                                            </Label>
                                            <Label
                                                htmlFor="role-coach"
                                                className={cn(
                                                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-2 min-h-10 transition-colors",
                                                    registerData.role === "coach"
                                                        ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                                                        : "border-white/12 bg-white/5 text-slate-200"
                                                )}
                                            >
                                                <RadioGroupItem value="coach" id="role-coach" className="border-white/45 text-cyan-300" />
                                                <span className="text-xs font-medium">Coach</span>
                                            </Label>
                                        </RadioGroup>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="register-password" className="text-xs uppercase tracking-wider text-slate-300">Password</Label>
                                            <Input
                                                id="register-password"
                                                type="password"
                                                value={registerData.password}
                                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                                placeholder="••••••••"
                                                required
                                                disabled={isLoading}
                                                className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="register-confirm" className="text-xs uppercase tracking-wider text-slate-300">Confirm Password</Label>
                                            <Input
                                                id="register-confirm"
                                                type="password"
                                                value={registerData.confirmPassword}
                                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                                placeholder="••••••••"
                                                required
                                                disabled={isLoading}
                                                className="bg-white/5 border-white/15 rounded-xl min-h-10 sm:min-h-11"
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full rounded-xl min-h-10 sm:min-h-11" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Account
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
