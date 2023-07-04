import type { WASM } from '@wonderlandengine/api';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';
import { injectMethod } from './injectMethod.js';
import type { WLETraceRecorder } from '../WLETraceRecorder.js';

export function injectRecorderHooks(recorder: WLETraceRecorder, proto: any, name: string) {
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
            beforeHook: (_wasm: WASM, _methodName: string, _args: any[]) => {
                recorder.enterHook();
            },
            afterHook: (_wasm: WASM, methodName: string, args: any[], retVal: any) => {
                recorder.leaveHook();
                recorder.recordWASMGeneric(isCall, methodName, args, false, retVal);
            },
            exceptionHook: (_wasm: WASM, methodName: string, args: any[], _err: unknown) => {
                recorder.leaveHook();
                recorder.recordWASMGeneric(isCall, methodName, args, true);
            }
        });
    }
}