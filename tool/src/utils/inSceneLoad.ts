import { type WonderlandEngine, type WASM } from '@wonderlandengine/api';

export const inSceneLoad = new Map<WASM, [hadInit: boolean, engine: WonderlandEngine]>();