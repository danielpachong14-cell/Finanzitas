/**
 * Standarized API Error Handler
 * Centralizes error parsing, console logging, and user notification.
 */
export function handleApiError(error: unknown, fallbackMessage: string = "Ocurrió un error en la operación") {
    console.error(`[API Error]: ${fallbackMessage}`, error);

    let userMessage = fallbackMessage;

    if (error instanceof Error) {
        userMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        userMessage = String((error as any).message);
    }

    // Fallback simple a la alerta del navegador (se puede sustituir por un Toast System)
    alert(userMessage);
}
