/**
 * BOT_PRO_MR
 * Módulo: deriv-trade.js (Ejecución Directa de Baja Latencia)
 */

export class DerivTradeManager {
    constructor(connection) {
        this.ws = connection; // Instancia activa de la conexión WebSocket con Deriv
    }

    /**
     * Ejecuta una compra directa en Deriv reduciendo el viaje de red
     * @param {Object} tradeParams - { action: 'CALL'|'PUT', duration: 5, duration_unit: 't' }
     */
    async executeTradeDirect(tradeParams) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[TRADE] Error: Conexión WebSocket no disponible.');
            return;
        }

        // Mapeo de parámetros para la API de Deriv
        const contractType = tradeParams.action === 'CALL' ? 'CALL' : 'PUT';
        const symbol = tradeParams.symbol || '1HZ10V'; // Modificar por el índice deseado
        const stake = tradeParams.stake || 1;          // Monto de la entrada

        const buyRequest = {
            buy: 1,
            price: stake,
            parameters: {
                amount: stake,
                basis: 'stake',
                contract_type: contractType,
                currency: 'USD',
                duration: tradeParams.duration || 5,
                duration_unit: tradeParams.duration_unit || 't',
                symbol: symbol
            }
        };

        console.log(`[TRADE] 🚀 Enviando Orden Directa a Deriv: ${contractType} en ${symbol} (${tradeParams.duration} Ticks)`);
        
        // Envío directo por el socket
        this.ws.send(JSON.stringify(buyRequest));
    }
}

// Alias de exportación para compatibilidad con bot-engine.js
export const derivTrade = DerivTradeManager;

// Soporte global para navegador y entornos CommonJS
if (typeof window !== 'undefined') {
    window.DerivTradeManager = DerivTradeManager;
    window.derivTrade = DerivTradeManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DerivTradeManager, derivTrade: DerivTradeManager };
}
