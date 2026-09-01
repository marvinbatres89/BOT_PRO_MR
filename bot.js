/**
 * BOT_PRO_MR
 * Módulo: bot.js (Punto de Entrada Principal)
 */

import botEngine, { BotEngine } from './bot-engine.js?v=FIX18-FINAL';

const activeEngine = botEngine || (BotEngine ? new BotEngine() : null);

if (typeof window !== 'undefined') {
    window.botEngine = activeEngine;
    
    window.receiveAnalyzerSignal = function(signalData) {
        if (activeEngine && typeof activeEngine.onSignalReceived === 'function') {
            activeEngine.onSignalReceived(signalData);
        } else {
            console.warn('[BOT] El motor no está listo para recibir señales.');
        }
    };
}

console.log('[BOT] Módulo principal cargado e integrado correctamente.');
