"use client";

import { AppLayout } from"@/components/layout/AppLayout";
import { User, Settings, LogOut, FileText, Globe } from"lucide-react";
import { useUserOptions } from"@/core/context/UserContext";
import { useEffect, useState } from"react";
import { supabase } from"@/core/api/supabase";
import { useRouter } from"next/navigation";

export default function ProfilePage() {
  const { currency, setCurrency, theme, setTheme, loading: optionsLoading } = useUserOptions();
  const [userEmail, setUserEmail] = useState<string>("Cargando...");
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ||"Usuario");
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
    { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  ];
  return (
    <AppLayout>
      <div className="p-6 bg-background min-h-screen transition-colors">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        </header>

        <div className="flex items-center space-x-4 mb-8 bg-card p-4 rounded-[28px] border border-border/50">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-2xl font-bold uppercase">
            {userEmail !=="Cargando..."? userEmail.substring(0, 2) :"U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground truncate max-w-[200px]">{userEmail.split('@')[0]}</h2>
            <p className="text-muted-foreground font-medium text-sm truncate max-w-[200px]">{userEmail}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="w-full flex items-center justify-between p-5 bg-card rounded-[24px] border border-border/50 hover: transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe size={24} className="text-primary"/>
              </div>
              <div className="text-left">
                <span className="block font-bold text-foreground text-lg leading-tight">Divisa Principal</span>
                <span className="block text-xs font-medium text-muted-foreground mt-0.5">Moneda base para tu portafolio global</span>
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={optionsLoading}
              className="bg-muted font-bold text-foreground p-3 rounded-xl outline-none border border-transparent focus:border-border/50 focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-base"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>

          <div className="w-full flex items-center justify-between p-5 bg-card rounded-[24px] border border-border/50 transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                <Settings size={24} className="text-foreground"/>
              </div>
              <div className="text-left">
                <span className="block font-bold text-foreground text-lg leading-tight">Modo Oscuro</span>
                <span className="block text-xs font-medium text-muted-foreground mt-0.5">Apariencia de la aplicación</span>
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div
                className={`bg-white w-6 h-6 rounded-full transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <button className="w-full flex items-center justify-between p-5 bg-card rounded-[24px] border border-border/50 hover: hover:bg-muted/30 transition-all group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-muted-foreground/10 transition-colors shrink-0">
                <FileText size={24} className="text-foreground"/>
              </div>
              <span className="font-bold text-foreground text-lg">Exportar Datos</span>
            </div>
          </button>

          <button onClick={handleSignOut} className="w-full flex items-center justify-between p-5 mt-8 bg-destructive/10 rounded-[24px] hover:bg-destructive/20 transition-all text-destructive group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center group-hover:bg-background/80 transition-colors shrink-0">
                <LogOut size={24} />
              </div>
              <span className="font-bold text-lg">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
