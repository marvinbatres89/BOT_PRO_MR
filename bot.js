/**
 * BOT_PRO_MR
 * Módulo: bot.js (Punto de Entrada Principal)
 */

import botEngine, { BotEngine } from './bot-engine.js?v=FIX18-FINAL';

// Asegurar instancia activa del motor
const activeEngine = botEngine || (BotEngine ? new BotEngine() : null);

if (typeof window !== 'undefined') {
    window.botEngine = activeEngine;
    
    // Función global para la recepción de señales desde TRADING-ANALYZER-MR
    window.receiveAnalyzerSignal = function(signalData) {
        if (activeEngine && typeof activeEngine.onSignalReceived === 'function') {
            activeEngine.onSignalReceived(signalData);
        } else {
            console.warn('[BOT] El motor no está listo para recibir señales.');
        }
    };

    // Vincular evento de clic del botón "CONECTAR PUENTE" al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
        const btnConectar = document.getElementById('btnConectarPuente') || document.querySelector('button:contains("CONECTAR PUENTE")');
        
        // Buscar por texto o id si el botón existe en el DOM
        const buttons = Array.from(document.querySelectorAll('button'));
        const bridgeBtn = buttons.find(btn => btn.textContent.includes('CONECTAR PUENTE'));

        if (bridgeBtn) {
            bridgeBtn.addEventListener('click', () => {
                console.log('[BOT] Iniciando conexión del puente de señales...');
                if (activeEngine && typeof activeEngine.init === 'function') {
                    // Si el WebSocket ya existe en window, inicializa el motor
                    if (window.ws) {
                        activeEngine.init(window.ws);
                    }
                    alert('Puente de señales conectado correctamente.');
                } else {
                    console.log('[BOT] Puente activado y a la espera de señales.');
                    alert('Puente activado en modo recepción.');
                }
            });
        }
    });
}

console.log('[BOT] Módulo principal cargado e integrado correctamente.');
