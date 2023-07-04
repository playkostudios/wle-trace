import { type WASM } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

// FIXME this will eventually create issues, because async calls take a long
//       time to complete, causing inHook to be true (false-positive)

export function injectAsyncDepthHooks(recorder: WLETraceRecorder, proto: any, name: string) {
    injectMethod(proto, name, {
        beforeHook: (_wasm: WASM, _methodName: string, _args: unknown[]) => {
            recorder.enterHook();
        },
        afterHook: (_wasm: WASM, _methodName: string, _args: unknown[], retVal: Promise<unknown>) => {
            retVal.finally(() => recorder.leaveHook());
        },
        exceptionHook: (_wasm: WASM, _methodName: string, _args: unknown[], _err: unknown) => {
            recorder.leaveHook();
        }
    });
}