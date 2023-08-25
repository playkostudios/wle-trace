let nonceIdx = 0;

export function checkIfWorkerIsOurs(serviceWorker: ServiceWorker, timeoutMS: number): Promise<[version: number, messagePort: MessagePort] | null> {
    return new Promise((resolve, _reject) => {
        const messageChannel = new MessageChannel();
        const clientPort = messageChannel.port1;

        function cleanup() {
            clientPort.onmessage = null;

            if (timeoutID !== null) {
                clearTimeout(timeoutID);
                timeoutID = null;
            }
        }

        let timeoutID: number | null = setTimeout(() => {
            resolve(null);
            cleanup();
        }, timeoutMS);

        const nonce = `wle-trace-sw:${nonceIdx++}:${(Math.trunc(Math.random() * 0xfffffffffffff)).toString(16).padStart(13)}`;
        clientPort.onmessage = (ev) => {
            let wasValidResponse = false;
            const msg = ev.data;
            if (msg !== null && typeof msg === 'object' && msg.type === 'wle-trace-ready' && typeof msg.version === 'number') {
                wasValidResponse = true;
                if (msg.nonce === nonce) {
                    resolve([msg.version, clientPort]);
                    cleanup();
                }
            }

            if (!wasValidResponse) {
                resolve(null);
                cleanup();
            }
        };

        serviceWorker.postMessage({
            type: 'wle-trace-init', nonce,
        }, [ messageChannel.port2 ]);
    })
}