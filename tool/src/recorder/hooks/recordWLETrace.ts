import { WLETraceRecorder } from '../WLETraceRecorder.js';
import { type MethodTypeMapsJSON } from '../types/MethodTypeMapsJSON.js';
import { injectScene } from './Scene.js';
import { injectTypedArrayRecorder } from './TypedArray.js';
import { injectWASMRecorder } from './WASM.js';

export async function recordWLETrace(typeMapJSON?: MethodTypeMapsJSON): Promise<WLETraceRecorder> {
    const recorder = new WLETraceRecorder();

    if (typeMapJSON) {
        recorder.registerTypeMapsFromJSON(typeMapJSON);
    }

    injectTypedArrayRecorder(recorder);
    injectScene(recorder);
    await injectWASMRecorder(recorder);
    await recorder.waitForReady();

    return recorder;
}