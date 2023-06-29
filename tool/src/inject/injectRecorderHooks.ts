import type { WASM } from '@wonderlandengine/api';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';
import { injectMethod } from './injectMethod.js';
import type { WLETraceController } from '../WLETraceController.js';

export function injectRecorderHooks(controller: WLETraceController, proto: any, name: string) {
    const isCall = !name.startsWith('_wljs_');
    if (isCall) {
        // only allow _wl_ prefixes, _malloc and _free
        if (name !== '_malloc' && name !== '_free' && !name.startsWith('_wl_')) {
            return;
        }
    }

    const descriptor = getPropertyDescriptor(proto, name);
    if (descriptor.value && (typeof descriptor.value) === 'function') {
        injectMethod(proto, name, {
            afterHook: (_wasm: WASM, methodName: string, args: any[], retVal: any) => {
                controller.recordWASMGeneric(isCall, methodName, args, false, retVal);
            },
            exceptionHook: (_wasm: WASM, methodName: string, args: any[], _err: unknown) => {
                controller.recordWASMGeneric(isCall, methodName, args, true);
            }
        });
    }
}