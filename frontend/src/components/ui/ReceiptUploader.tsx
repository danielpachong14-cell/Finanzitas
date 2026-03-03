"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle2, Loader2, X } from "lucide-react";

export interface ParsedReceiptData {
    amount?: number;
    merchant?: string;
    date?: string;
}

interface ReceiptUploaderProps {
    onUploadSuccess: (fileUrl: string, parsedData?: ParsedReceiptData) => void;
}

export function ReceiptUploader({ onUploadSuccess }: ReceiptUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fileDetails, setFileDetails] = useState<{ name: string; url?: string } | null>(null);
    const [errorIndicator, setErrorIndicator] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    }, []);

    const processFile = async (file: File) => {
        if (!file) return;

        // Valiations
        const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isValidType) {
            setErrorIndicator("Solo admitimos Imágenes o PDFs.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            setErrorIndicator("El archivo es demasiado grande (Máx 5MB).");
            return;
        }

        setErrorIndicator(null);
        setFileDetails({ name: file.name });
        setIsUploading(true);

        try {
            // 1. UPLOAD TO SUPABASE STORAGE
            // Here we simulate the real upload to give visual feedback before AI starts
            const formData = new FormData();
            formData.append('file', file);

            // Temporary: Since bucket creation is manual, we simulate the storage upload returning a local URL
            const mockFileUrl = URL.createObjectURL(file);

            setIsUploading(false);
            setIsAnalyzing(true);

            // 2. SEND TO OPEN AI PARSER (MOCK ROUTE)
            const response = await fetch('/api/analyze-receipt', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Falló el análisis del documento');
            }

            const { data } = await response.json();

            setIsAnalyzing(false);
            setFileDetails(prev => prev ? { ...prev, url: mockFileUrl } : null);

            // Hit parent callback
            onUploadSuccess(mockFileUrl, data);

        } catch (err: any) {
            setErrorIndicator(err.message || "Ocurrió un error misterioso procesando tu archivo.");
            setIsUploading(false);
            setIsAnalyzing(false);
            setFileDetails(null);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFileDetails(null);
        setErrorIndicator(null);
    };

    return (
        <div className="w-full mb-6">
            {fileDetails?.url ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in-95">
                    <div className="flex items-center space-x-3">
                        <div className="bg-emerald-500 rounded-full p-2 text-white">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-foreground">Documento Cargado y Analizado</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileDetails.name}</p>
                        </div>
                    </div>
                    <button onClick={removeFile} type="button" className="p-2 hover:bg-emerald-500/20 text-emerald-600 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[32px] cursor-pointer transition-all duration-200 ease-out will-change-transform ${isDragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : errorIndicator
                                ? 'border-destructive bg-destructive/5'
                                : 'border-border/60 hover:border-primary/50 hover:bg-muted/30 bg-card'
                        }`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
                        ) : isAnalyzing ? (
                            <div className="relative mb-3">
                                <FileText className="w-8 h-8 text-primary animate-pulse" />
                                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                            </div>
                        ) : (
                            <UploadCloud className={`w-8 h-8 mb-3 ${errorIndicator ? 'text-destructive' : 'text-muted-foreground'}`} />
                        )}

                        <p className="mb-1 text-sm font-bold text-foreground">
                            {isUploading && "Subiendo a la bóveda..."}
                            {isAnalyzing && "Buscando magia en el texto (OpenAI)..."}
                            {!isUploading && !isAnalyzing && (errorIndicator || "Sube una Factura o Recibo")}
                        </p>
                        {!isUploading && !isAnalyzing && !errorIndicator && (
                            <p className="text-xs text-muted-foreground font-medium">SVG, PNG, JPG o PDF (máx. 5MB)</p>
                        )}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={handleFileInput}
                        disabled={isUploading || isAnalyzing}
                    />
                </label>
            )}
        </div>
    );
}
