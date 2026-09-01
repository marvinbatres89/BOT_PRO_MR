/**
 * BOT_PRO_MR
 * Módulo: signal-bridge.js (Sincronización de Alta Velocidad)
 */

class SignalBridge {
    constructor(botEngine) {
        this.botEngine = botEngine;
        this.minConfidence = 72; // Umbral de confianza alineado con el nuevo motor
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

        // 1. Filtrar señales neutrales o sin dirección
        if (!signalData || signalData.signal === 'NEUTRAL') {
            return;
        }

        // 2. Control de disparo (Evitar órdenes duplicadas en ráfaga)
        if (this.isProcessing || (now - this.lastSignalTime) < this.cooldownMs) {
            return;
        }

        // 3. Validar umbral de confianza
        if (signalData.confidence < this.minConfidence) {
            console.log(`[BRIDGE] Señal ${signalData.signal} descartada por confianza insuficiente (${signalData.confidence}% < ${this.minConfidence}%)`);
            return;
        }

        // Lock de ejecución instantánea
        this.isProcessing = true;
        this.lastSignalTime = now;

        try {
            console.log(`[BRIDGE] 🔥 Señal de Alta Probabilidad Recibida: ${signalData.signal} (${signalData.confidence}%) - ${signalData.reason}`);
            
            // EJECUCIÓN DIRECTA: Envía la orden directamente a deriv-trade sin pasar por demoras
            if (this.botEngine && typeof this.botEngine.executeTradeDirect === 'function') {
                await this.botEngine.executeTradeDirect({
                    action: signalData.signal,
                    confidence: signalData.confidence,
                    duration: 5,        // Duración en Ticks por defecto
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

if (typeof window !== 'undefined') {
    window.SignalBridge = SignalBridge;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignalBridge;
}
