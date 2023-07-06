import { injectRecorderHooks } from '../inject/injectRecorderHooks.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectWonderlandEngineLateHook } from '../../common/hooks/WonderlandEngine.js';

export async function lateInjectWonderlandEngineRecorder(recorder: WLETraceRecorder): Promise<void> {
    const wasm = recorder.wasm;

    for (const name of Object.getOwnPropertyNames(wasm)) {
        injectRecorderHooks(recorder, wasm, name);
    }

    await injectWonderlandEngineLateHook();
}