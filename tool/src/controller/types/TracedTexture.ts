import { type WonderlandEngine } from '@wonderlandengine/api';

export interface TracedTexture {
    readonly id: number;
    readonly engine: WonderlandEngine;
    __wle_trace_destruction_trace?: string | null;
}