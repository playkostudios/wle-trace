import { type WonderlandEngine } from '@wonderlandengine/api';

export interface TracedMesh {
    readonly _index: number;
    readonly engine: WonderlandEngine;
    __wle_trace_destruction_trace?: string | null;
}