/**
 * BOT_PRO_MR
 * Módulo: bot-engine.js
 */

import { derivTrade } from './deriv-trade.js?v=FIX18-FINAL';

export class BotEngine {
    constructor(config = {}) {
        this.ws = null;
        this.tradeManager = null;
        this.symbol = config.symbol || '1HZ10V';
        this.stake = config.stake || 1;
        this.minConfidence = 72;
        this.isProcessing = false;
        this.lastSignalTime = 0;
        this.cooldownMs = 2000;
        this.isReady = false;
    }

    init(wsConnection) {
        if (!wsConnection) {
            console.error('[ENGINE] Error: Se requiere una conexión WebSocket válida.');
            return;
        }

        this.ws = wsConnection;
        const TradeClass = derivTrade || window.DerivTradeManager;

        if (TradeClass) {
            this.tradeManager = new TradeClass(this.ws);
        }

        this.isReady = true;
        console.log('[ENGINE] Motor de trading inicializado y listo.');
    }

    async executeTradeDirect(params) {
        if (!this.tradeManager) {
            console.error('[ENGINE] Error: TradeManager no está inicializado.');
            return;
        }

        const tradeConfig = {
            action: params.action,
            symbol: params.symbol || this.symbol,
            stake: params.stake || this.stake,
            duration: params.duration || 5,
            duration_unit: params.duration_unit || 't'
        };

        await this.tradeManager.executeTradeDirect(tradeConfig);
    }

    async onSignalReceived(signalData) {
        const now = Date.now();
        if (!signalData || signalData.signal === 'NEUTRAL') return;
        if (this.isProcessing || (now - this.lastSignalTime) < this.cooldownMs) return;
        if (signalData.confidence < this.minConfidence) return;

        this.isProcessing = true;
        this.lastSignalTime = now;

        try {
            console.log(`[ENGINE] 🚀 Señal recibida: ${signalData.signal} (${signalData.confidence}%)`);
            await this.executeTradeDirect({
                action: signalData.signal,
                confidence: signalData.confidence
            });
        } catch (error) {
            console.error('[ENGINE] Error procesando señal:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}

// Instancia lista para usar
export const botEngine = new BotEngine();

// Exportaciones explícitas de la clase y la instancia
export { BotEngine };
export default botEngine;

if (typeof window !== 'undefined') {
    window.BotEngine = BotEngine;
    window.botEngine = botEngine;
}
