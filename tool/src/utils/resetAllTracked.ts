import { type WonderlandEngine } from '@wonderlandengine/api';
import { trackedComponents } from './trackedComponents.js';
import { trackedMeshes } from './trackedMeshes.js';
import { trackedMaterials } from './trackedMaterials.js';
import { trackedObject3Ds } from './trackedObject3Ds.js';
import { trackedTextures } from './trackedTextures.js';

export function resetAllTracked(engine: WonderlandEngine) {
    for (const comp of trackedComponents.getAll(engine)) {
        delete comp['__wle_trace_destroyed_data'];
        delete comp['__wle_trace_destroying_data'];
    }
    trackedComponents.clear(engine);

    for (const obj of trackedObject3Ds.getAll(engine)) {
        delete obj['__wle_trace_destroyed_data'];
        delete obj['__wle_trace_destroying_data'];
    }
    trackedObject3Ds.clear(engine);

    trackedMaterials.clear(engine);
    trackedMeshes.clear(engine);
    trackedTextures.clear(engine);
}