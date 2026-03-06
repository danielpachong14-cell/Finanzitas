import { useState, useEffect } from "react";
import { Institution } from "@/core/api";
import { Button } from "@/components/ui/button";
import { X, Building2, Save } from "lucide-react";

interface InstitutionFormModalProps {
    isOpen: boolean;
    editingInstitution: Institution | null;
    onClose: () => void;
    onSave: (payload: Partial<Institution>) => Promise<void>;
}

const ENTITY_TYPES = [
    { value: 'bank', label: 'Banco' },
    { value: 'broker', label: 'Broker' },
    { value: 'crypto_exchange', label: 'Exchange Cripto' },
    { value: 'real_estate', label: 'Inmobiliaria' },
    { value: 'other', label: 'Otro Custodio' }
];

const COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
    '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
    '#f97316', '#ef4444', '#1f2937', '#78716c'
];

export function InstitutionFormModal({ isOpen, editingInstitution, onClose, onSave }: InstitutionFormModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other'>('bank');
    const [color, setColor] = useState(COLORS[6]); // default to blue
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingInstitution) {
                setName(editingInstitution.name);
                setType(editingInstitution.type);
                setColor(editingInstitution.color || COLORS[6]);
            } else {
                setName("");
                setType('bank');
                setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
            }
        }
    }, [isOpen, editingInstitution]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            return alert("El nombre es requerido");
        }

        setSaving(true);
        try {
            await onSave({
                name: name.trim(),
                type,
                color,
                icon: 'building' // Default icon for now
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 fade-in duration-200">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md flex flex-col bg-card border border-border/50 rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden slide-in-from-bottom-8 duration-300">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 sm:px-8 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-3 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                            <Building2 className="text-primary relative z-10" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none">
                                {editingInstitution ? "Editar Entidad" : "Nueva Entidad"}
                            </h2>
                            <p className="text-sm font-bold text-muted-foreground mt-1">
                                {editingInstitution ? "Modifica los datos del custodio" : "Registra un banco o broker"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors bg-card shadow-sm border border-border/50 hover:border-border">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre de la Entidad</label>
                            <input
                                autoFocus
                                required
                                type="text"
                                placeholder="Ej: Binance, Interactive Brokers, Bancolombia..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none placeholder:text-muted-foreground/50 focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                disabled={saving}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipo de Entidad</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ENTITY_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setType(t.value as any)}
                                        className={`h-12 rounded-xl text-sm font-bold transition-all border ${type === t.value
                                                ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                                                : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground hover:border-border'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Asigna un Color</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-10 h-10 rounded-full transition-transform outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${color === c ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                        aria-label={`Seleccionar color ${c}`}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 sm:p-8 bg-muted/30 border-t border-border/50 mt-auto">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-14 text-lg font-black rounded-2xl shadow-lg hover:shadow-xl transition-all"
                    >
                        {saving ? (
                            "Guardando..."
                        ) : (
                            <>
                                <Save className="mr-2" size={24} />
                                {editingInstitution ? "Actualizar Entidad" : "Crear Entidad"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
