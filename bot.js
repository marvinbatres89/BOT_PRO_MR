/**
 * BOT_PRO_MR
 * Módulo: bot.js (Punto de Entrada Principal)
 */

import { derivTrade } from './deriv-trade.js?v=FIX15-0-DIRECT-TRADE';
import { signalBridge } from './signal-bridge.js?v=FIX15-0-DIRECT-TRADE';
import { botEngine, BotEngine } from './bot-engine.js?v=FIX15-0-DIRECT-TRADE';

// Asegurar instancia activa del motor
const activeEngine = botEngine || (BotEngine ? new BotEngine() : null);

// Escuchador global para conectar la interfaz con el motor
if (typeof window !== 'undefined') {
    window.botEngine = activeEngine;
    
    // Función de recepción de señales desde TRADING-ANALYZER-MR
    window.receiveAnalyzerSignal = function(signalData) {
        if (activeEngine && typeof activeEngine.onSignalReceived === 'function') {
            activeEngine.onSignalReceived(signalData);
        } else {
            console.warn('[BOT] El motor no está listo para recibir señales.');
        }
    };
}

console.log('[BOT] Módulo principal cargado e integrado correctamente.');
