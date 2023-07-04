import { WonderlandEngine } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';

export function injectWonderlandEngineLateHook(injectCallback?: (engine: WonderlandEngine) => void): Promise<WonderlandEngine> {
    return new Promise((resolve, _reject) => {
        // XXX _wl_ methods (not _wljs_) are only added after loadRuntime is
        //     called. to hook them we have to hook into an init function AND
        //     THEN inject to those now-present methods
        injectMethod(WonderlandEngine.prototype, '_init', {
            afterHook: (engine: WonderlandEngine, _methodName: string, _args: any[], _retVal: any) => {
                if (injectCallback) {
                    injectCallback(engine);
                }

                // mark injections as done (some features will be auto-toggled
                // by the user here)
                resolve(engine);
            },
        });
    });
}