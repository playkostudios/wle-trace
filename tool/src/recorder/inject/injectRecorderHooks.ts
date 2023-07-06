import { type WASM } from '@wonderlandengine/api';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

export function injectRecorderHooks(recorder: WLETraceRecorder, proto: any, name: string) {
    const isCall = !name.startsWith('_wljs_');
    if (isCall) {
        // only allow _wl_ prefixes, _malloc, _free and stringToUTF8
        if (name !== '_malloc' && name !== '_free' && name !== 'stringToUTF8' && !name.startsWith('_wl_')) {
            return;
        }
    }

    const descriptor = getPropertyDescriptor(proto, name);
    if (descriptor.value && (typeof descriptor.value) === 'function') {
        injectMethod(proto, name, {
            beforeHook: (_wasm: WASM, methodName: string, args: any[]) => {
                recorder.enterHook();
                recorder.recordWASMGenericCallEnter(isCall, methodName, args);
            },
            afterHook: (_wasm: WASM, methodName: string, args: any[], retVal: any) => {
                recorder.recordWASMGenericCallLeave(isCall, methodName, args, false, retVal);
                recorder.leaveHook();
            },
            exceptionHook: (_wasm: WASM, methodName: string, args: any[], _err: unknown) => {
                recorder.recordWASMGenericCallLeave(isCall, methodName, args, true);
                recorder.leaveHook();
            }
        });

    }
}