"use client";

import { ReactNode, useState } from "react";
import { Home, PieChart, CreditCard, User, Target, Tags, ChevronLeft, ChevronRight, LogOut, Briefcase, Eye, EyeOff, Building2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUserOptions } from "@/core/context/UserContext";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { hideBalances, toggleHideBalances } = useUserOptions();

  const navItems = [
    { icon: Home, label: "Home", href: "/dashboard" },
    { icon: Target, label: "Presupuestos", href: "/budgets" },
    { icon: Tags, label: "Categorías", href: "/categories" },
    { icon: PieChart, label: "Estadísticas", href: "/statistics" },
    { icon: Briefcase, label: "Portafolio", href: "/portfolio" },
    { icon: Building2, label: "Entidades", href: "/institutions" },
    { icon: User, label: "Perfil", href: "/profile" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      {!hideNav && (
        <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? "w-20 items-center px-4" : "w-64 px-6"} bg-card border-r border-border py-8 fixed h-full z-10 transition-all duration-300`}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-10 bg-primary text-primary-foreground p-1 rounded-full border border-card z-20 hover:scale-110 transition-transform hidden lg:flex items-center justify-center cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className="flex items-center mb-12">
            <div className={`w-10 h-10 shrink-0 bg-primary rounded-2xl flex items-center justify-center ${!isSidebarCollapsed && "mr-3"}`}>
              <span className="text-primary-foreground font-bold tracking-tighter">FP</span>
            </div>
            {!isSidebarCollapsed && <h1 className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden text-ellipsis">Finanzas</h1>}
          </div>

          <nav className="flex-1 space-y-2 w-full">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "space-x-4 px-4"} py-3 rounded-2xl transition-all ${isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto w-full space-y-2">
            <button
              onClick={toggleHideBalances}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "space-x-4 px-4"} py-3 text-muted-foreground hover:bg-muted rounded-2xl transition-colors`}
              title={isSidebarCollapsed ? "Privacidad" : undefined}
            >
              {hideBalances ? <EyeOff size={22} className="shrink-0" /> : <Eye size={22} className="shrink-0" />}
              {!isSidebarCollapsed && <span className="font-bold">{hideBalances ? "Mostrar Saldos" : "Ocultar Saldos"}</span>}
            </button>
            <button
              onClick={() => router.push("/login")}
              className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "space-x-4 px-4"} py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-colors`}
              title={isSidebarCollapsed ? "Cerrar Sesión" : undefined}
            >
              <LogOut size={22} className="shrink-0" />
              {!isSidebarCollapsed && <span className="font-bold">Logout</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen ${!hideNav ? (isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64") : ""} transition-all duration-300 relative`}>
        {/* We wrap the content in a container, allowing it to stretch on tablet and max out on desktop. */}
        <div className={`flex-1 w-full mx-auto ${hideNav ? "" : "max-w-full lg:max-w-5xl"} relative overflow-y-auto pb-24 lg:pb-0`}>
          {children}
        </div>
      </main>

      {/* Mobile Floating Bottom Navigation (lg:hidden) */}
      {!hideNav && (
        <nav className="lg:hidden fixed bottom-6 left-0 right-0 px-6 z-20 pointer-events-none">
          {/* Internal wrapper for the pill that catches pointer events */}
          <div className="pointer-events-auto flex bg-card rounded-[32px] justify-between items-center px-4 sm:px-6 py-4 border border-border/50 backdrop-blur-md max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center justify-center transition-all ${isActive ? "text-primary -translate-y-1" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute -bottom-3"></span>
                  )}
                </button>
              );
            })}
            <button
              onClick={toggleHideBalances}
              className={`flex flex-col items-center justify-center transition-all text-muted-foreground hover:text-foreground`}
            >
              {hideBalances ? <EyeOff size={24} strokeWidth={2} /> : <Eye size={24} strokeWidth={2} />}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
