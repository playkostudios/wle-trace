import { WLETraceController } from '../WLETraceController.js';
import { injectWASMRecorder } from './WASM.js';
import { injectWonderlandEngineRecorder } from './WonderlandEngine.js';

export async function recordWLETrace(): Promise<WLETraceController> {
    const controller = new WLETraceController(true);

    injectWASMRecorder(controller);
    await injectWonderlandEngineRecorder(controller);

    console.debug("[wle-trace CONTROLLER] Recording mode active. Don't forget to stop recording by calling controller.stopRecording()");

    return controller;
}