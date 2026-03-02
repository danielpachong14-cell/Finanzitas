"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/core/auth/AuthService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FeedbackAlert } from "@/components/ui/FeedbackAlert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

type AuthView = "login" | "register" | "forgot_password" | "update_password";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthView>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Exchange code for session if present (Supabase PKCE flow)
    const code = searchParams.get("code");
    if (code) {
      AuthService.exchangeCode(code).catch(() => { });
    }

    // Check if URL has ?view=update_password (from Supabase email redirect)
    if (searchParams.get("view") === "update_password" || code) {
      setView("update_password");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (view === "login") {
        const success = await AuthService.signIn(email, password);
        if (success) {
          router.push("/dashboard");
        } else {
          setError("Correo o contraseña incorrectos.");
        }
      } else if (view === "register") {
        if (password !== confirmPassword) {
          setError("Las contraseñas no coinciden.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }

        const success = await AuthService.signUp(email, password, name);
        if (success) {
          setSuccessMsg("¡Registro exitoso! Revisa tu correo (si aplica) o inicia sesión.");
          setView("login");
        } else {
          setError("Error al registrarse. Puede que el correo ya esté en uso.");
        }
      } else if (view === "forgot_password") {
        const success = await AuthService.resetPassword(email);
        if (success) {
          setSuccessMsg("Si el correo existe, hemos enviado un enlace de recuperación.");
        } else {
          setError("Error al procesar la solicitud.");
        }
      } else if (view === "update_password") {
        if (password !== confirmPassword) {
          setError("Las contraseñas no coinciden.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }

        const { success, error: updateError } = await AuthService.updatePassword(password);
        if (success) {
          setSuccessMsg("¡Contraseña actualizada con éxito! Puedes iniciar sesión.");
          resetForm();
          setView("login");
          // Clean up the URL
          router.replace("/login");
        } else {
          setError(updateError || "Tu enlace es inválido o ha expirado. Por favor, solicita uno nuevo.");
        }
      }
    } catch (err) {
      console.error("Auth action failed:", err);
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setPassword("");
    setConfirmPassword("");
  };

  const changeView = (newView: AuthView) => {
    resetForm();
    setView(newView);
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

        <Card className="border-border/50 rounded-[32px] bg-card relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-foreground font-bold">
              {view === "login" && "Iniciar Sesión"}
              {view === "register" && "Crear una Cuenta"}
              {view === "forgot_password" && "Recuperar Contraseña"}
              {view === "update_password" && "Actualizar Contraseña"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {view === "login" && "Accede a tu panel de control de finanzas."}
              {view === "register" && "Únete para gestionar todo tu acervo patrimonial."}
              {view === "forgot_password" && "Te enviaremos un enlace para restaurar el acceso."}
              {view === "update_password" && "Ingresa tu nueva contraseña para acceder."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <FeedbackAlert type="error" message={error} />}
            {successMsg && <FeedbackAlert type="success" message={successMsg} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              {view === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-semibold">Nombre Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Juan Pérez"
                    required
                    className="rounded-2xl bg-muted border-none focus-visible:ring-primary h-14 px-4 text-base"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-semibold">Correo Electrónico</Label>
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

              {view !== "forgot_password" && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="password" className="text-foreground font-semibold">
                    {view === "update_password" ? "Nueva Contraseña" : "Contraseña"}
                  </Label>
                  <PasswordInput
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {(view === "register" || view === "update_password") && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="confirm_password" className="text-foreground font-semibold">Confirmar Contraseña</Label>
                  <PasswordInput
                    id="confirm_password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {view === "login" && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => changeView("forgot_password")}
                    className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mt-2"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground py-7 h-14 text-lg font-bold transition-all hover:-translate-y-1 mt-6"
                disabled={loading}
              >
                {loading ? "Procesando..." : (
                  view === "login" ? "Ingresar" :
                    view === "register" ? "Registrarse" :
                      view === "update_password" ? "Guardar Contraseña" :
                        "Enviar Enlace"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/10 pt-6 mt-4">
            {view === "login" ? (
              <p className="text-sm text-muted-foreground text-center">
                ¿No tienes cuenta? <button type="button" onClick={() => changeView("register")} className="text-primary hover:underline font-bold">Regístrate</button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => changeView("login")}
                className="text-sm text-muted-foreground hover:text-foreground font-semibold flex items-center gap-2 transition-colors m-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a Inicio de Sesión
              </button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
