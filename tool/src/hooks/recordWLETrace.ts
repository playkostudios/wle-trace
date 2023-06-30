import { MethodTypeMapsJSON } from '../replay/common.js';
import { WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectTypedArrayRecorder } from './TypedArray.js';
import { injectWASMRecorder } from './WASM.js';
import { injectWonderlandEngineRecorder } from './WonderlandEngine.js';

export async function recordWLETrace(typeMapJSON?: MethodTypeMapsJSON): Promise<WLETraceRecorder> {
    const recorder = new WLETraceRecorder();

    if (typeMapJSON) {
        recorder.registerTypeMapsFromJSON(typeMapJSON);
    }

    injectTypedArrayRecorder(recorder);
    injectWASMRecorder(recorder);
    await injectWonderlandEngineRecorder(recorder);

    return recorder;
}