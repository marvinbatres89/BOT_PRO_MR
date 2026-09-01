/**
 * BOT_PRO_MR
 * Módulo: signal-bridge.js
 */

export class SignalBridge {
    constructor(botEngine) {
        this.botEngine = botEngine;
    }

    processSignal(signalData) {
        if (this.botEngine && typeof this.botEngine.onSignalReceived === 'function') {
            this.botEngine.onSignalReceived(signalData);
        }
    }
}

export const signalBridge = SignalBridge;

if (typeof window !== 'undefined') {
    window.SignalBridge = SignalBridge;
    window.signalBridge = SignalBridge;
}
