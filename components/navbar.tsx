"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, X, MessageCircle, FileCheck, Home, Info, LogIn, User, LogOut, Wand2, ClipboardList, Tags } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/lib/supabase/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AuthDialog } from "@/components/auth-dialog"

export function Navbar() {
  const { t, language } = useLanguage()
  const { user, signOut, loading: authLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // 客户端挂载后才显示认证相关UI，避免hydration不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { href: "/", label: language === "en" ? "Home" : "首页", icon: Home },
    { href: "/assessment", label: language === "en" ? "GTV Assessment" : "GTV资格评估", icon: FileCheck },
    { href: "/material-collection", label: language === "en" ? "Materials" : "材料收集", icon: ClipboardList },
    { href: "/material-tags", label: language === "en" ? "Tag Settings" : "标签设置", icon: Tags },
    { href: "/copywriting", label: language === "en" ? "AI Copywriting" : "AI文案", icon: Wand2 },
    { href: "/chat", label: language === "en" ? "AI Consultation" : "AI咨询", icon: MessageCircle },
    { href: "/about", label: language === "en" ? "About Us" : "关于我们", icon: Info },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex items-center gap-2">
              <Image 
                src="/xichi_logo.svg" 
                alt="Xichi Group Logo" 
                width={32} 
                height={32} 
                className="h-8 w-8 rounded-lg"
              />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {language === "en" ? "Xichi Group" : "惜池集团"}
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                {language === "en" ? "UK Immigration Service Provider" : "英国移民服务供应商"}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            <LanguageSwitcher />
            
            {/* Auth Section - 仅在客户端挂载后渲染以避免hydration不匹配 */}
            {!mounted || authLoading ? (
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {language === "en" ? "Profile" : "个人资料"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut()
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {language === "en" ? "Sign Out" : "退出登录"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthDialogOpen(true)}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                {language === "en" ? "Sign In" : "登录"}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && !authLoading && !user && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthDialogOpen(true)}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                {language === "en" ? "Sign In" : "登录"}
              </Button>
            )}
            {mounted && !authLoading && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      {language === "en" ? "Profile" : "个人资料"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut()
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {language === "en" ? "Sign Out" : "退出登录"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted rounded-md"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Auth Dialog */}
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </nav>
  )
}

