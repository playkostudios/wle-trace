import { WASM } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { HookOptions } from '../inject/addHooksToMember.js';
import { type WLETraceEarlyInjector } from '../WLETraceEarlyInjector.js';

export function injectWASMEarlyHook(setTarget: WLETraceEarlyInjector, wljsInitHookOptions?: HookOptions): Promise<WASM> {
    // XXX there must be a special case for _wljs_init; this is called when the
    //     engine WASM instance is initialized. we need to hook into this so we
    //     can start handling some types of calls early on, otherwise, things
    //     like the recorder will miss calls to _malloc
    return new Promise((resolve, _reject) => {
        let firstTime = true;
        let beforeHook;
        const userBeforeHook = wljsInitHookOptions?.beforeHook;
        if (userBeforeHook) {
            beforeHook = (wasm: WASM, methodName: string, args: any[]) => {
                if (firstTime) {
                    firstTime = false;
                    setTarget.wasm = wasm;
                    resolve(wasm);
                }

                userBeforeHook(wasm, methodName, args);
            };
        } else {
            beforeHook = (wasm: WASM, _methodName: string, _args: any[]) => {
                if (firstTime) {
                    firstTime = false;
                    setTarget.wasm = wasm;
                    resolve(wasm);
                }
            };
        }

        injectMethod(WASM.prototype, '_wljs_init', {
            ...wljsInitHookOptions,
            beforeHook,
        });
    });
}