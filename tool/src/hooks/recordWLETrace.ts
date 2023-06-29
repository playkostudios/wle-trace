import { WLETraceController, MethodTypeMapsJSON } from '../WLETraceController.js';
import { injectTypedArrayRecorder } from './TypedArray.js';
import { injectWASMRecorder } from './WASM.js';
import { injectWonderlandEngineRecorder } from './WonderlandEngine.js';

export async function recordWLETrace(typeMapJSON?: MethodTypeMapsJSON): Promise<WLETraceController> {
    const controller = new WLETraceController(true);

    if (typeMapJSON) {
        controller.registerTypeMapsFromJSON(typeMapJSON);
    }

    injectTypedArrayRecorder(controller);
    injectWASMRecorder(controller);
    await injectWonderlandEngineRecorder(controller);

    console.debug("[wle-trace CONTROLLER] Recording mode active. Don't forget to stop recording by calling controller.stopRecording()");

    return controller;
}