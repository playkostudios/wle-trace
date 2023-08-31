import { getGlobalSWInjector } from '../../common/WLETraceSWInjector.js';
import { WLETraceRecorder } from '../WLETraceRecorder.js';
import { type MethodTypeMapsJSON } from '../types/MethodTypeMapsJSON.js';
import { injectScene } from './Scene.js';
import { injectTypedArrayRecorder } from './TypedArray.js';
import { injectWASMRecorder } from './WASM.js';

export async function recordWLETrace(typeMapJSON?: MethodTypeMapsJSON): Promise<WLETraceRecorder> {
    const swInjector = getGlobalSWInjector();
    const loadRuntime = await swInjector.makeLoadRuntimeWrapper((...args) => {
        // injectTypedArrayRecorder(recorder);
        // injectScene(recorder);
        // await injectWASMRecorder(recorder);
        // await recorder.waitForReady();
        console.debug('stage 2 injector called!', ...args);
    }, (...args) => {
        // injectTypedArrayRecorder(recorder);
        // injectScene(recorder);
        // await injectWASMRecorder(recorder);
        // await recorder.waitForReady();
        console.debug('stage 3 injector called!', ...args);
    });

    const recorder = new WLETraceRecorder(loadRuntime);

    if (typeMapJSON) {
        recorder.registerTypeMapsFromJSON(typeMapJSON);
    }

    return recorder;
}