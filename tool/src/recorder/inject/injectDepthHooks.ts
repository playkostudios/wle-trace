import { type WASM } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

export function injectDepthHooks(recorder: WLETraceRecorder, proto: any, name: string) {
    injectMethod(proto, name, {
        beforeHook: (_wasm: WASM, _methodName: string, _args: unknown[]) => {
            recorder.enterHook();
        },
        afterHook: (_wasm: WASM, _methodName: string, _args: unknown[], _retVal: unknown) => {
            recorder.leaveHook();
        },
        exceptionHook: (_wasm: WASM, _methodName: string, _args: unknown[], _err: unknown) => {
            recorder.leaveHook();
        }
    });
}