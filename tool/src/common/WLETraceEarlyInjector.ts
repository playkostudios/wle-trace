import { WASM } from '@wonderlandengine/api';

export interface WLETraceEarlyInjector {
    set wasm(wasm: WASM);
    get wasm(): WASM | null;
}