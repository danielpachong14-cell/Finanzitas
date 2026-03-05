"use client";

import { useState, useEffect } from "react";
import { Institution } from "@/core/api";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface InstitutionEditModalProps {
    isOpen: boolean;
    institution: Institution | null;
    onClose: () => void;
    onSave: (id: string, newName: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function InstitutionEditModal({ isOpen, institution, onClose, onSave, onDelete }: InstitutionEditModalProps) {
    const [editInstName, setEditInstName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (institution) {
            setEditInstName(institution.name);
        }
    }, [institution]);

    if (!isOpen || !institution) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editInstName.trim()) return;
        setSaving(true);
        try {
            await onSave(institution.id, editInstName.trim());
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar la entidad "${institution.name}"? Los activos vinculados pasarán a Posesión Propia.`)) return;
        setSaving(true);
        try {
            await onDelete(institution.id);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-card w-full sm:w-[500px] h-auto rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-foreground">Editar Entidad</h2>
                    <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl p-2 h-auto" disabled={saving}>
                        <Trash2 size={20} />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre de Entidad / Custodio</label>
                        <input
                            type="text"
                            required
                            value={editInstName}
                            onChange={e => setEditInstName(e.target.value)}
                            placeholder="Ej. NuBank, JPMorgan..."
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                            disabled={saving}
                        />
                    </div>

                    <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0 mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold border-border/50 bg-card hover:bg-muted"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:-translate-y-0.5"
                            disabled={saving || !editInstName.trim()}
                        >
                            {saving ? 'Guardando...' : 'Guardar Edición'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
