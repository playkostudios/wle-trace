import { WLETraceController } from '../WLETraceController.js';
import { injectWASMReplayer } from './WASM.js';
import { injectWonderlandEngineReplayer } from './WonderlandEngine.js';

export async function replayWLETrace(): Promise<WLETraceController> {
    const controller = new WLETraceController();

    injectWASMReplayer(controller);
    await injectWonderlandEngineReplayer(controller);

    return controller;
}