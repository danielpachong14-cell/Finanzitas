"use client";

import { useEffect, useRef } from "react";
import { ApiClient } from "@/core/api";
import { FmpService } from "@/core/api/providers/FmpService";

export function useDailyMarketSync() {
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const syncMarketPrices = async () => {
            try {
                // Verificar si ya se sincronizó hoy
                const today = new Date().toISOString().split('T')[0];
                const lastSyncDate = localStorage.getItem('finanzitas_fmp_last_sync');

                if (lastSyncDate === today) {
                    console.log(`[Market Sync] FMP Quotes already synchronized today (${today}). Skipping.`);
                    return;
                }

                console.log(`[Market Sync] Initiating daily synchronization with FMP...`);
                // Obtener todos los activos
                const assets = await ApiClient.getAssets();
                const investments = assets.filter(a => a.type === 'digital' && a.digital_type === 'investment' && a.ticker_symbol);

                if (investments.length === 0) {
                    localStorage.setItem('finanzitas_fmp_last_sync', today);
                    return;
                }

                let updatedSome = false;

                // Para cada inversión, buscar el precio actual y recalcular
                for (const inv of investments) {
                    if (!inv.ticker_symbol) continue;

                    try {
                        // Obtener transacciones para calcular cuántas acciones/unidades posee actualmente
                        const transactions = await ApiClient.getAssetTransactions(inv.id);

                        const totalShares = transactions.reduce((sum, tx) => {
                            return tx.type === 'buy' ? sum + Number(tx.quantity) : sum - Number(tx.quantity);
                        }, 0);

                        // Si ya no tiene acciones, su valor es cero
                        if (totalShares <= 0) {
                            if (inv.current_value !== 0) {
                                await ApiClient.updateAsset(inv.id, { current_value: 0 });
                                updatedSome = true;
                            }
                            continue;
                        }

                        // Obtener precio en vivo (o en caché de 24h gracias al endpoint Next.js)
                        const quote = await FmpService.getQuote(inv.ticker_symbol);
                        if (!quote || typeof quote.price !== 'number') continue;

                        const newValue = totalShares * quote.price;

                        // Si el valor varió (ej. > 0.01 de diferencia por decimales), actualizar en BD
                        if (Math.abs(newValue - inv.current_value) > 0.01) {
                            await ApiClient.updateAsset(inv.id, { current_value: newValue });
                            console.log(`[Market Sync] Updated ${inv.ticker_symbol} from $${inv.current_value} to $${newValue.toFixed(2)}`);
                            updatedSome = true;
                        }
                    } catch (err) {
                        console.error(`[Market Sync] Failed to sync ${inv.ticker_symbol}`, err);
                    }
                }

                // Guardar bandera en localStorage si al menos pudimos correr el ciclo sin crash
                localStorage.setItem('finanzitas_fmp_last_sync', today);

                if (updatedSome) {
                    console.log(`[Market Sync] Finished. New portfolio valuation stored in DB.`);
                    // Opcional: Se podría disparar un evento global simple para forzar recarga si el usuario ya está en Portfolio
                    window.dispatchEvent(new Event('dashboard_needs_refresh'));
                } else {
                    console.log(`[Market Sync] Finished. No valuation changes needed.`);
                }
            } catch (globalError) {
                console.error("[Market Sync] Critical failure during execution:", globalError);
            }
        };

        // Darle 3 segundos antes de iniciar para priorizar el renderizado inicial UI
        const timer = setTimeout(() => {
            syncMarketPrices();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);
}
