import { type WASM } from '@wonderlandengine/api';
import { BaseAllocationMap } from '../common/BaseAllocationMap.js';

export class ReplayV1AllocationMap extends BaseAllocationMap {
    constructor(private wasm: WASM) {
        super();
    }

    protected override getVertexCount(meshIndex: number): number {
        return this.wasm._wl_mesh_get_vertexCount(meshIndex);
    }

    protected override getHeapU32(): Uint32Array {
        return this.wasm.HEAPU32;
    }
}