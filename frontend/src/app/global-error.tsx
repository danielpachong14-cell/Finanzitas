"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Optionally log the error to an error reporting service
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
                    <div className="bg-card w-full max-w-md rounded-[32px] p-8 flex flex-col items-center text-center shadow-lg border border-border/20">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-6">
                            <AlertTriangle size={32} />
                        </div>

                        <h2 className="text-2xl font-bold text-foreground mb-3">¡Vaya! Algo salió mal</h2>
                        <p className="text-muted-foreground mb-8">
                            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado (mock).
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <Button
                                onClick={() => window.location.href = "/"}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl"
                            >
                                Ir a Inicio
                            </Button>
                            <Button
                                onClick={() => reset()}
                                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                Intentar de nuevo
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
