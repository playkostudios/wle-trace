import { type WonderlandEngine } from '@wonderlandengine/api';
import { trackedDestroyMark } from './objectDestroy.js';
import { guardReclaimScene } from './guardReclaim.js';
import { type WLETraceController } from '../WLETraceController.js';

export function handleScenePostReplace(controller: WLETraceController, engine: WonderlandEngine, origin: string) {
    // destroy previously created objects and components
    trackedDestroyMark(controller, engine, origin);

    // reclaim objects in scene
    guardReclaimScene(controller, engine);
}