/**
 * BOT_PRO_MR
 * Módulo: signal-bridge.js (Sincronización de Alta Velocidad)
 */

export class SignalBridge {
    constructor(botEngine) {
        this.botEngine = botEngine;
        this.minConfidence = 72; // Umbral de confianza
        this.isProcessing = false;
        this.lastSignalTime = 0;
        this.cooldownMs = 2000;  // Tiempo de espera entre disparos (2 segundos)
    }

    /**
     * Procesa la señal recibida desde TRADING-ANALYZER-MR
     * @param {Object} signalData - { signal: 'CALL'|'PUT', confidence: number, reason: string }
     */
    async processSignal(signalData) {
        const now = Date.now();

        // 1. Filtrar señales neutrales
        if (!signalData || signalData.signal === 'NEUTRAL') {
            return;
        }

        // 2. Control de disparo (Evitar órdenes duplicadas)
        if (this.isProcessing || (now - this.lastSignalTime) < this.cooldownMs) {
            return;
        }

        // 3. Validar umbral de confianza
        if (signalData.confidence < this.minConfidence) {
            console.log(`[BRIDGE] Señal ${signalData.signal} descartada por confianza insuficiente (${signalData.confidence}% < ${this.minConfidence}%)`);
            return;
        }

        this.isProcessing = true;
        this.lastSignalTime = now;

        try {
            console.log(`[BRIDGE] 🔥 Señal de Alta Probabilidad Recibida: ${signalData.signal} (${signalData.confidence}%) - ${signalData.reason}`);
            
            if (this.botEngine && typeof this.botEngine.executeTradeDirect === 'function') {
                await this.botEngine.executeTradeDirect({
                    action: signalData.signal,
                    confidence: signalData.confidence,
                    duration: 5,
                    duration_unit: 't'
                });
            } else {
                console.warn('[BRIDGE] Motor de trading no disponible o sin método de ejecución directa.');
            }
        } catch (error) {
            console.error('[BRIDGE] Error en ejecución de orden:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}

// Alias de exportación para compatibilidad con bot.js
export const signalBridge = SignalBridge;

// Soporte global para navegador y entornos CommonJS
if (typeof window !== 'undefined') {
    window.SignalBridge = SignalBridge;
    window.signalBridge = SignalBridge;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SignalBridge, signalBridge: SignalBridge };
}
