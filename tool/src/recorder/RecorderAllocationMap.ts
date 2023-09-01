import { BaseAllocationMap } from '../common/BaseAllocationMap.js';
import { type WLETraceRecorder } from './WLETraceRecorder.js';

export class RecorderAllocationMap extends BaseAllocationMap {
    constructor(private recorder: WLETraceRecorder) {
        super();
    }

    protected override getVertexCount(meshIndex: number): number {
        const recorder = this.recorder;
        const getVertexCount = recorder.getVertexCount;

        if (!getVertexCount) {
            throw new Error("Can't get vertex count; getVertexCount not set");
        }

        return getVertexCount(meshIndex);
    }

    protected override getHeapU32(): Uint32Array {
        const heapBuffer = this.recorder.heapBuffer;
        if (!heapBuffer) {
            throw new Error("Can't get heap; heapBuffer not set");
        }

        return new Uint32Array(heapBuffer);
    }
}