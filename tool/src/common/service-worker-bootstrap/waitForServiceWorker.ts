function handleState(serviceWorker: ServiceWorker, resolve: () => void, reject: (err: unknown) => void): boolean {
    const curState = serviceWorker.state;
    if (curState === 'activated') {
        resolve();
        return true;
    } else if (curState === 'redundant') {
        reject(new Error('Worker installation failed'));
        return true;
    } else {
        return false;
    }
}

export function waitForServiceWorker(serviceWorker: ServiceWorker): Promise<void> {
    return new Promise((resolve, reject) => {
        if (handleState(serviceWorker, resolve, reject)) {
            return;
        }

        let statechangeHandler: (() => void) | null = () => {
            if (handleState(serviceWorker, resolve, reject)) {
                if (statechangeHandler) {
                    serviceWorker.removeEventListener('statechange', statechangeHandler);
                    statechangeHandler = null;
                }
            }
        };
        serviceWorker.addEventListener('statechange', statechangeHandler);
    });
}