"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Category } from "@/core/api/ApiClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [icon, setIcon] = useState("Tag");
  const [color, setColor] = useState("#E8F5E9");
  const [iconColor, setIconColor] = useState("#2E7D32");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await ApiClient.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories", error);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (category?: Category) => {
    if (category) {
      setEditingId(category.id);
      setName(category.name);
      setParentId(category.parent_id || "none");
      setIcon(category.icon || "Tag");
      setColor(category.color || "#E8F5E9");
      setIconColor(category.icon_color || "#2E7D32");
    } else {
      setEditingId(null);
      setName("");
      setParentId("none");
      setIcon("Tag");
      setColor(activeTab === 'expense' ? "#FFEBEE" : "#E8F5E9");
      setIconColor(activeTab === 'expense' ? "#C62828" : "#2E7D32");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const toggleExpand = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const finalParentId = parentId === "none" ? null : parentId;

      if (editingId) {
        await ApiClient.updateCategory(editingId, {
          name,
          parent_id: finalParentId,
          icon,
          color,
          icon_color: iconColor,
        });
      } else {
        await ApiClient.createCategory(
          name,
          activeTab,
          0,
          finalParentId,
          color,
          icon,
          iconColor
        );
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Error al guardar la categoría");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría? Las transacciones asociadas que tengan esta categoría quedarán sin una asignación válida o en 'Otros' si tu base de datos no usa borrado en cascada.")) return;
    setSaving(true);
    try {
      await ApiClient.deleteCategory(editingId);
      await loadData();
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar la categoría");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeTab && !c.parent_id);
  const subcats = categories.filter(c => c.type === activeTab && c.parent_id);

  const availableIcons = ["Tag", "ShoppingCart", "Home", "Car", "Coffee", "Utensils", "Smartphone", "HeartPulse", "GraduationCap", "Plane", "Zap", "Gift", "Briefcase", "PiggyBank", "TrendingUp", "DollarSign"];

  return (
    <AppLayout>
      <div className="bg-background flex flex-col relative min-h-screen transition-colors">
        <header className="px-6 py-8 pb-4 flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
            <p className="text-sm font-medium text-muted-foreground">Organiza tus finanzas</p>
          </div>
          <button
            onClick={() => openModal()}
            className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            title="Nueva Categoría"
          >
            <Plus size={24} />
          </button>
        </header>

        <div className="px-6 mb-6">
          <div className="flex p-1.5 bg-card rounded-2xl border border-border/50 relative w-full h-14">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-foreground rounded-[12px] transition-transform duration-300 ease-spring ${activeTab === 'income' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}
            />
            <button
              className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 ${activeTab === 'expense' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
              onClick={() => setActiveTab('expense')}
            >
              Egresos
            </button>
            <button
              className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 ${activeTab === 'income' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
              onClick={() => setActiveTab('income')}
            >
              Ingresos
            </button>
          </div>
        </div>

        <div className="p-6 pt-0 flex-1">
          {loading ? (
            <p className="text-center text-muted-foreground/50 mt-10 font-bold">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.length === 0 && (
                <div className="col-span-full text-center py-10 bg-card rounded-[32px] border-2 border-dashed border-border/60">
                  <p className="text-muted-foreground mb-2 font-bold text-lg">No hay categorías de {activeTab === 'income' ? 'ingresos' : 'egresos'}</p>
                </div>
              )}

              {filteredCategories.map(cat => {
                const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Tag;
                const catSubcats = subcats.filter(s => s.parent_id === cat.id);

                return (
                  <div
                    key={cat.id}
                    onClick={() => openModal(cat)}
                    className="bg-card rounded-[28px] p-5 border border-border/50 hover: transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComponent size={24} style={{ color: cat.icon_color || '#ffffff' }} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-bold text-foreground text-lg truncate group-hover:text-primary transition-colors">{cat.name}</h3>
                        <p className="text-sm font-medium text-muted-foreground truncate">{catSubcats.length} subcategorías</p>
                      </div>
                    </div>

                    {catSubcats.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                        {(expandedCategories[cat.id] ? catSubcats : catSubcats.slice(0, 3)).map(sub => (
                          <span key={sub.id} onClick={(e) => { e.stopPropagation(); openModal(sub); }} className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground border border-border/50 hover:bg-muted-foreground/10 transition-colors cursor-pointer hover:border-primary/50">
                            {sub.name}
                          </span>
                        ))}
                        {!expandedCategories[cat.id] && catSubcats.length > 3 && (
                          <span
                            onClick={(e) => toggleExpand(e, cat.id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/50 text-muted-foreground border border-border/30 hover:bg-muted-foreground/10 transition-colors cursor-pointer"
                            title="Ver todas"
                          >
                            +{catSubcats.length - 3} más
                          </span>
                        )}
                        {expandedCategories[cat.id] && catSubcats.length > 3 && (
                          <span
                            onClick={(e) => toggleExpand(e, cat.id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/50 text-muted-foreground border border-border/30 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title="Ocultar"
                          >
                            Ocultar
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- Modal Formulario --- */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
            <div className="bg-card w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
              <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

              <div className="flex justify-between items-center mb-8 shrink-0">
                <h2 className="text-2xl font-bold text-foreground">
                  {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                {editingId && (
                  <button
                    onClick={handleDelete}
                    className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    title="Eliminar Categoría"
                    disabled={saving}
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Supermercado"
                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold tracking-tight outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                  />
                </div>

                {/* Parent Select */}
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Pertenece a (Subcategoría)</label>
                  <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold tracking-tight outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none cursor-pointer"
                  >
                    <option value="none">--- Categoría Principal ---</option>
                    {filteredCategories.filter(c => c.id !== editingId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-3 ml-2">Icono Visual</label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                    {availableIcons.map(iconName => {
                      const CurrentIcon = (LucideIcons as any)[iconName] || LucideIcons.Tag;
                      const isSelected = icon === iconName;
                      return (
                        <button
                          key={iconName}
                          onClick={() => setIcon(iconName)}
                          className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-foreground text-background scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-card' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground'}`}
                        >
                          <CurrentIcon size={22} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Colors Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Color de Fondo</label>
                    <div className="flex items-center h-14 bg-muted rounded-2xl px-3 overflow-hidden border border-transparent relative focus-within:border-border/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-full h-full opacity-0 absolute cursor-pointer inset-0 z-10"
                      />
                      <div className="w-8 h-8 rounded-xl shrink-0 border border-black/10" style={{ backgroundColor: color }}></div>
                      <span className="ml-3 text-sm font-bold text-foreground uppercase tracking-wider">{color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Color del Icono</label>
                    <div className="flex items-center h-14 bg-muted rounded-2xl px-3 overflow-hidden border border-transparent relative focus-within:border-border/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input
                        type="color"
                        value={iconColor}
                        onChange={e => setIconColor(e.target.value)}
                        className="w-full h-full opacity-0 absolute cursor-pointer inset-0 z-10"
                      />
                      <div className="w-8 h-8 rounded-xl shrink-0 border border-black/10" style={{ backgroundColor: iconColor }}></div>
                      <span className="ml-3 text-sm font-bold text-foreground uppercase tracking-wider">{iconColor}</span>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="pt-6 border-t border-border/50 mt-4">
                  <label className="block text-sm font-bold text-muted-foreground mb-4 text-center tracking-wider uppercase">Vista Previa</label>
                  <div className="flex justify-center mb-8">
                    <div className="bg-card rounded-[24px] p-5 border border-border/50 w-full max-w-sm flex items-center space-x-4 transform transition-all hover:scale-[1.02]">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 object-cover"
                        style={{ backgroundColor: color }}
                      >
                        {(() => {
                          const PrevIcon = (LucideIcons as any)[icon] || LucideIcons.Tag;
                          return <PrevIcon size={26} style={{ color: iconColor }} />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-xl truncate leading-tight">
                          {name || 'Nombre Categoría'}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                          {parentId !== 'none'
                            ? `Subcategoría de ${categories.find(c => c.id === parentId)?.name}`
                            : 'Categoría Principal'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold border-border/50 bg-card hover:bg-muted"
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:-translate-y-0.5"
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
