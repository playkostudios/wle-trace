import { WLETraceReplayer } from '../WLETraceReplayer.js';
import { injectWASMReplayer } from './WASM.js';
import { injectWonderlandEngineReplayer } from './WonderlandEngine.js';

export async function replayWLETrace(): Promise<WLETraceReplayer> {
    const replayer = new WLETraceReplayer();

    injectWASMReplayer(replayer);
    await injectWonderlandEngineReplayer(replayer);

    return replayer;
}