let nonceIdx = 0;

export function checkIfWorkerIsOurs(serviceWorker: ServiceWorker, timeoutMS: number): Promise<number | null> {
    const navServiceWorker = navigator.serviceWorker;

    return new Promise((resolve, _reject) => {
        function cleanup() {
            if (messageHandler) {
                navServiceWorker.removeEventListener('message', messageHandler);
                messageHandler = null;
            }

            if (timeoutID !== null) {
                clearTimeout(timeoutID);
                timeoutID = null;
            }
        }

        let timeoutID: number | null = setTimeout(() => {
            resolve(null);
            cleanup();
        }, timeoutMS);

        const nonce = `wle-trace-sw:${nonceIdx++}:${Math.random()}`;
        let messageHandler: ((ev: MessageEvent<any>) => void) | null = null;
        navServiceWorker.addEventListener('message', (ev) => {
            let wasValidResponse = false;
            const msg = ev.data;
            if (msg !== null && typeof msg === 'object' && msg.type === 'wle-trace-version' && typeof msg.version === 'number') {
                wasValidResponse = true;
                if (msg.nonce === nonce) {
                    resolve(msg.version);
                    cleanup();
                }
            }

            if (!wasValidResponse) {
                resolve(null);
                cleanup();
            }
        });

        serviceWorker.postMessage({
            type: 'wle-trace-get-version',
        });
    })
}