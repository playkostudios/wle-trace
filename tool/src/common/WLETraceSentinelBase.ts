export abstract class WLETraceSentinelBase {
    sentinelHandlers = new Array<() => void>();

    constructor() {
        window.addEventListener('error', () => {
            this.triggerSentinel('uncaught exception');
        });
    }

    addSentinelHandler(callback: () => void) {
        this.sentinelHandlers.push(callback);
    }

    triggerSentinel(reason = 'triggered manually by user') {
        console.error(`[wle-trace CONTROLLER] sentinel triggered. reason: ${reason}`);

        for (const handler of this.sentinelHandlers) {
            try {
                handler();
            } catch(err) {
                console.error('[wle-trace CONTROLLER] uncaught exception is sentinel handler');
            }
        }
    }
}