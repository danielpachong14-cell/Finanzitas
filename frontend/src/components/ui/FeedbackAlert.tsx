import { AlertCircle } from "lucide-react";

interface FeedbackAlertProps {
    type: 'error' | 'success';
    message: string;
}

export function FeedbackAlert({ type, message }: FeedbackAlertProps) {
    if (type === 'error') {
        return (
            <div className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{message}</span>
            </div>
        );
    }

    return (
        <div className="mb-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl text-sm font-medium">
            <span>{message}</span>
        </div>
    );
}
