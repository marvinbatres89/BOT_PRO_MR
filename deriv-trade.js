/**
 * BOT_PRO_MR
 * Módulo: deriv-trade.js (Ejecución Directa WebSocket)
 */

export class DerivTradeManager {
    constructor(wsConnection) {
        this.ws = wsConnection;
        this.reqIdCounter = 100;
    }

    async executeTradeDirect(config) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[DERIV-TRADE] Error: WebSocket desinterconectado.');
            return;
        }

        const contractType = config.action === 'CALL' ? 'CALL' : 'PUT';
        this.reqIdCounter++;

        const proposalProposalReq = {
            proposal: 1,
            amount: config.stake,
            basis: 'stake',
            contract_type: contractType,
            currency: 'USD',
            duration: config.duration,
            duration_unit: config.duration_unit,
            symbol: config.symbol,
            req_id: this.reqIdCounter
        };

        console.log(`[DERIV-TRADE] Enviando orden ${contractType} para ${config.symbol}...`);
        this.ws.send(JSON.stringify(proposalProposalReq));
    }
}

export const derivTrade = DerivTradeManager;

if (typeof window !== 'undefined') {
    window.DerivTradeManager = DerivTradeManager;
    window.derivTrade = DerivTradeManager;
}
