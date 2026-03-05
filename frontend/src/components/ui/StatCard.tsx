import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | ReactNode;
    icon?: ReactNode;
    colorClass?: string;
    valueClass?: string;
    className?: string;
}

export function StatCard({
    label,
    value,
    icon,
    colorClass = "text-brand-blue",
    valueClass = "text-[13px] sm:text-sm",
    className,
}: StatCardProps) {
    return (
        <div className={cn("bg-muted/50 rounded-2xl p-3 flex flex-col justify-center", className)}>
            {icon && (
                <div className={cn("w-5 h-5 mb-1.5", colorClass)}>
                    {icon}
                </div>
            )}
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {label}
            </p>
            <div className={cn("font-black text-foreground leading-tight", valueClass)}>
                {value}
            </div>
        </div>
    );
}
