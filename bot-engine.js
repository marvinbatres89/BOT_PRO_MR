/**
 * BOT_PRO_MR
 * Módulo: bot-engine.js (Motor Principal de Coordinación y Ejecución)
 */

import { derivTrade } from './deriv-trade.js';
import { signalBridge } from './signal-bridge.js';

export class BotEngine {
    constructor(config = {}) {
        this.ws = null;
        this.tradeManager = null;
        this.bridge = null;
        this.symbol = config.symbol || '1HZ10V';
        this.stake = config.stake || 1;
        this.isReady = false;
    }

    /**
     * Inicializa las conexiones y los sub-módulos del bot
     * @param {WebSocket} wsConnection - Instancia activa del WebSocket de Deriv
     */
    init(wsConnection) {
        if (!wsConnection) {
            console.error('[ENGINE] Error: Se requiere una conexión WebSocket válida.');
            return;
        }

        this.ws = wsConnection;
        
        // Instanciar Administrador de Operaciones y Puente de Señales
        const TradeClass = derivTrade || window.DerivTradeManager;
        const BridgeClass = signalBridge || window.SignalBridge;

        if (TradeClass) {
            this.tradeManager = new TradeClass(this.ws);
        }

        if (BridgeClass) {
            this.bridge = new BridgeClass(this);
        }

        this.isReady = true;
        console.log('[ENGINE] Motor de trading inicializado y listo.');
    }

    /**
     * Pasa la orden de compra directamente al TradeManager reduciendo latencia
     * @param {Object} params - { action: 'CALL'|'PUT', duration: number, duration_unit: string }
     */
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

        // Ejecución hacia la API de Deriv
        await this.tradeManager.executeTradeDirect(tradeConfig);
    }

    /**
     * Recibe señales desde la herramienta TRADING-ANALYZER-MR
     * @param {Object} signalData
     */
    onSignalReceived(signalData) {
        if (this.bridge) {
            this.bridge.processSignal(signalData);
        } else {
            console.warn('[ENGINE] Puente de señales no disponible.');
        }
    }
}

// Exportación como alias 'botEngine' para resolver la importación requerida por bot.js
export const botEngine = BotEngine;

// Compatibilidad con entorno global de navegador y CommonJS
if (typeof window !== 'undefined') {
    window.BotEngine = BotEngine;
    window.botEngine = BotEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotEngine, botEngine: BotEngine };
}
