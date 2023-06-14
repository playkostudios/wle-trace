import { type WonderlandEngine } from '@wonderlandengine/api';
import { trackedDestroyMark } from './objectDestroy.js';
import { guardReclaimScene } from './guardReclaim.js';

export function handleScenePostReplace(engine: WonderlandEngine, origin: string) {
    // destroy previously created objects and components
    trackedDestroyMark(engine, origin);

    // reclaim objects in scene
    guardReclaimScene(engine);
}