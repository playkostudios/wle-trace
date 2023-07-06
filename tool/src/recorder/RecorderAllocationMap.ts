import { BaseAllocationMap } from '../common/BaseAllocationMap.js';
import { type WLETraceRecorder } from './WLETraceRecorder.js';

export class RecorderAllocationMap extends BaseAllocationMap {
    constructor(private recorder: WLETraceRecorder, private friendKey: symbol) {
        super();
    }

    protected override getVertexCount(meshIndex: number): number {
        const recorder = this.recorder;
        const wasm = recorder.wasm;

        if (!wasm) {
            throw new Error("Can't get vertex count; WASM not set");
        }

        // XXX friend methods are stinky, maybe find a better way
        recorder.setIgnore(true, this.friendKey);
        const vertexCount = wasm._wl_mesh_get_vertexCount(meshIndex);
        recorder.setIgnore(false, this.friendKey);
        return vertexCount;
    }

    protected override getHeapU32(): Uint32Array {
        const wasm = this.recorder.wasm;
        if (!wasm) {
            throw new Error("Can't get u32 heap; WASM not set");
        }

        return wasm.HEAPU32;
    }
}