"use client";

import { useState } from"react";
import { useRouter } from"next/navigation";
import { AuthService } from"@/core/auth/AuthService";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await AuthService.signIn(email, password);
      if (success) {
        router.push("/dashboard");
      } else {
        alert("Error al iniciar sesión o registrarse. Revisa tus credenciales.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl mb-4 flex items-center justify-center">
            <span className="text-primary-foreground text-2xl font-bold tracking-tighter">FP</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground">Acervo Patrimonial</p>
        </div>

        <Card className="border-border/50 rounded-[32px] bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-muted-foreground">
              Acede a tu panel de control de finanzas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email"className="text-foreground font-semibold">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  required
                  className="rounded-2xl bg-muted border-none focus-visible:ring-primary h-14 px-4 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="password"className="text-foreground font-semibold">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  className="rounded-2xl bg-muted border-none focus-visible:ring-primary h-14 px-4 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground py-7 h-14 text-lg font-bold transition-all hover: hover:-translate-y-1 mt-6"
                disabled={loading}
              >
                {loading ?"Ingresando...":"Ingresar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center mt-4">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta? <a href="#"className="text-primary hover:underline font-bold">Regístrate</a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
