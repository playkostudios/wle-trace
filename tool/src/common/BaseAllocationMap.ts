import { MeshIndexType, type WASM } from '@wonderlandengine/api';
import { ValueType } from './types/ValueType.js';

export abstract class BaseAllocationMap {
    // format: flat triplets with index, start offset and end offset
    // - memory ranges never overlap
    // - end might be equal to start of different range
    // - ordered by start value
    private raw = new Array<number>();
    private nextID = 0;

    private getIndexFromValue(value: number, tripletIdx: number): number | null {
        let focus = this.raw.indexOf(value);

        while (focus !== -1) {
            if ((focus % 3) === tripletIdx) {
                // wanted triplet value matched
                return focus - tripletIdx;
            } else {
                // unwanted tripled value matched
                focus = this.raw.indexOf(value, focus + 1);
            }
        }

        return null;
    }

    clear(): void {
        this.raw.length = 0;
        this.nextID = 0;
    }

    private deallocateFromIdx(index: number) {
        // console.debug(`[wle-trace ALLOC_MAP] deallocated ID ${this.raw[index]}, range ${this.raw[index + 1]}:${this.raw[index + 2]}`);
        this.raw.splice(index, 3);
    }

    private handleOverlap(index: number) {
        // throw new Error("Allocation failed; overlapping memory ranges");
        this.deallocateFromIdx(index);
        // console.warn('[wle-trace ALLOC_MAP] deallocated due to overlapping memory range');
    }

    allocateStride(start: number, stride: number, componentSize: number, count: number): number | null {
        if (stride < componentSize) {
            throw new Error('Allocation failed; invalid stride');
        } else if (count === 0 || componentSize === 0) {
            return null;
        }

        const startID = this.nextID;
        const iMax = start + stride * count;

        for (let i = start; i < iMax; i += stride) {
            this.allocate(i, i + componentSize);
        }

        return startID;
    }

    allocate(start: number, end: number): number | null {
        if (start === end) {
            // XXX this can naturally happen for pre-allocated empty strings
            // console.warn("[wle-trace ALLOC_MAP] zero-length allocation; ID incremented but no allocation made");
            this.nextID++;
            return null;
        } else if (start > end) {
            throw new Error("Allocation failed; negative-length allocation");
        }

        // find suitable insert position from range start
        const iMax = this.raw.length;

        for (let i = 0; i < iMax; i += 3) {
            const oStart = this.raw[i + 1];
            if (oStart >= start) {
                // after our range, we can insert here. check if there is an
                // overlap
                if (oStart < end) {
                    this.handleOverlap(i);
                    i -= 3;
                    continue;
                }

                const id = this.nextID++;
                // console.debug(`[wle-trace ALLOC_MAP] allocated ID ${id} (mid of map), range ${start}:${end}`);
                this.raw.splice(i, 0, id, start, end);
                return id;
            } else {
                const oEnd = this.raw[i + 2];
                if (oEnd > start) {
                    this.handleOverlap(i);
                    i -= 3;
                    continue;
                }
            }
        }

        // can't insert before any existing range, add to end
        const id = this.nextID++;
        // console.debug(`[wle-trace ALLOC_MAP] allocated ID ${id} (end of map), range ${start}:${end}`);
        this.raw.push(id, start, end);
        return id;
    }

    deallocate(id: number) {
        const index = this.getIndexFromValue(id, 0);

        if (index === null) {
            throw new Error("Can't deallocate memory range; not allocated");
        } else {
            this.deallocateFromIdx(index);
        }
    }

    deallocateFromStart(start: number): number {
        const index = this.getIndexFromValue(start, 1);
        if (index === null) {
            throw new Error("Can't deallocate memory range; not allocated");
        }

        const id = this.raw[index - 1];
        this.raw.splice(index - 1, 3);
        return id;
    }

    maybeGetID(offset: number): null | [allocID: number, relOffset: number] {
        const iMax = this.raw.length;

        for (let i = 0; i < iMax; i += 3) {
            const start = this.raw[i + 1];
            if (start > offset) {
                continue;
            }

            const end = this.raw[i + 2];
            if (end <= offset) {
                continue;
            }

            return [this.raw[i], offset - start];
        }

        return null;
    }

    getID(offset: number): [allocID: number, relOffset: number] {
        const id = this.maybeGetID(offset);
        if (id === null) {
            throw new Error("Allocated memory range not found");
        } else {
            return id;
        }
    }

    maybeGetIDFromStart(start: number): number | null {
        const index = this.getIndexFromValue(start, 1);

        if (index === null) {
            return null;
        } else {
            return this.raw[index];
        }
    }

    getIDFromStart(start: number): number {
        const id = this.maybeGetIDFromStart(start);
        if (id === null) {
            throw new Error("Allocated memory range not found");
        } else {
            return id;
        }
    }

    maybeGetIDFromRange(start: number, end: number): null | [allocID: number, relOffset: number] {
        const iMax = this.raw.length;

        for (let i = 0; i < iMax; i += 3) {
            const oStart = this.raw[i + 1];
            if (oStart > start) {
                continue;
            }

            const oEnd = this.raw[i + 2];
            if (oEnd <= start || oEnd < end) {
                continue;
            }

            return [this.raw[i], start - oStart];
        }

        return null;
    }

    getIDFromRange(start: number, end: number): [allocID: number, relOffset: number] {
        const id = this.maybeGetIDFromRange(start, end);
        if (id === null) {
            throw new Error("Allocated memory range not found");
        } else {
            return id;
        }
    }

    handleCallAllocationChanges(retArgs: Array<unknown>, thisMethodTypeMap: Array<ValueType>): void {
        const allocMap = new Array<[start: number | null, end: number | null]>();
        const iDataMap = new Array<[structPtr: number | null, dataPtr: number | null]>();
        const iMax = thisMethodTypeMap.length;

        for (let i = 0; i < iMax; i++) {
            const argType = thisMethodTypeMap[i];
            const val = retArgs[i];

            if (argType === ValueType.PointerAlloc) {
                if (typeof val !== 'number') {
                    throw new Error('Expected PointerAlloc to be a number');
                }

                let foundPair = false;
                for (const allocPair of allocMap) {
                    if (allocPair[0] === null) {
                        foundPair = true;
                        allocPair[0] = val;

                        if ((allocPair[1] as number) < 0) {
                            allocPair[1] = val - (allocPair[1] as number);
                        }
                        break;
                    }
                }

                if (!foundPair) {
                    allocMap.push([val, null]);
                }
            } else if (argType === ValueType.PointerAllocEnd) {
                if (typeof val !== 'number') {
                    throw new Error('Expected PointerAllocEnd to be a number');
                }

                let foundPair = false;
                for (const allocPair of allocMap) {
                    if (allocPair[1] === null) {
                        foundPair = true;
                        allocPair[1] = val;
                        break;
                    }
                }

                if (!foundPair) {
                    allocMap.push([null, val]);
                }
            } else if (argType === ValueType.PointerAllocSize) {
                if (typeof val !== 'number') {
                    throw new Error('Expected PointerAllocSize to be a number');
                }

                let foundPair = false;
                for (const allocPair of allocMap) {
                    if (allocPair[1] === null) {
                        foundPair = true;
                        allocPair[1] = allocPair[0]! + val;
                        break;
                    }
                }

                if (!foundPair) {
                    allocMap.push([null, -val]);
                }
            } else if (argType >= ValueType.PointerPreStart) {
                const bytes = argType - ValueType.PointerPreStart + 1;

                if (typeof val !== 'number') {
                    throw new Error(`Expected PointerPre${bytes} to be a number`);
                }

                allocMap.push([ val, val + bytes ]);
            } else if (argType === ValueType.PointerFree) {
                if (typeof val !== 'number') {
                    throw new Error('Expected PointerFree to be a number');
                }

                this.deallocateFromStart(val);
            } else if (argType === ValueType.IndexDataStructPointer) {
                if (typeof val !== 'number') {
                    throw new Error('Expected IndexDataStructPointer to be a number');
                }

                let foundPair = false;
                for (const iDataPair of iDataMap) {
                    if (iDataPair[0] === null) {
                        foundPair = true;
                        iDataPair[0] = val;
                        break;
                    }
                }

                if (!foundPair) {
                    iDataMap.push([val, null]);
                }
            } else if (argType === ValueType.IndexDataPointer) {
                if (typeof val !== 'number' && val !== null) {
                    throw new Error('Expected IndexDataPointer to be a number or null');
                }

                let foundPair = false;
                for (const iDataPair of iDataMap) {
                    if (iDataPair[1] === null) {
                        foundPair = true;
                        iDataPair[1] = val ?? 0; // XXX can't be null!
                        break;
                    }
                }

                if (!foundPair) {
                    iDataMap.push([null, val ?? 0]); // XXX can't be null!
                }
            } else if (argType === ValueType.MeshAttributeStructPointer) {
                if (typeof val !== 'number') {
                    throw new Error('Expected MeshAttributeStructPointer to be a number');
                }

                const ptr32 = val / 4;
                const heap = this.getHeapU32();
                if (heap[ptr32] !== 255) {
                    const offset = heap[ptr32 + 1];
                    const stride = heap[ptr32 + 2];
                    const componentCount = heap[ptr32 + 4];

                    let meshIndex = null;

                    for (let j = 0; j < iMax; j++) {
                        if (thisMethodTypeMap[j] === ValueType.MeshAttributeMeshIndex) {
                            meshIndex = retArgs[j];

                            if (typeof meshIndex !== 'number') {
                                throw new Error('Expected MeshAttributeMeshIndex to be a number');
                            }

                            break;
                        }
                    }

                    if (meshIndex === null) {
                        throw new Error('Missing matching MeshAttributeMeshIndex value');
                    }

                    // FIXME ideally we wouldn't have to do an extra
                    //       call. figure out if there is a way to do
                    //       this without side-effects
                    const vertexCount = this.getVertexCount(meshIndex);
                    this.allocateStride(offset, stride, componentCount, vertexCount);
                }
            }
        }

        for (const [struct, ptr] of iDataMap) {
            if (struct === null || ptr === null) {
                throw new Error('Invalid index data map in call/callback');
            }

            if (ptr !== 0) {
                const struct32 = struct / 4;
                const heap = this.getHeapU32();
                const indexCount = heap[struct32];
                const indexSize = heap[struct32 + 1];

                if (indexSize === MeshIndexType.UnsignedByte) {
                    this.allocate(ptr, ptr + indexCount);
                } else if (indexSize === MeshIndexType.UnsignedShort) {
                    this.allocate(ptr, ptr + indexCount * 2);
                } else if (indexSize === MeshIndexType.UnsignedInt) {
                    this.allocate(ptr, ptr + indexCount * 4);
                }
            }
        }

        for (const [start, end] of allocMap) {
            if (start === null || end === null) {
                throw new Error('Invalid allocation map in call/callback');
            }

            this.allocate(start, end);
        }
    }

    getAbsoluteOffset(allocID: number, relOffset: number): number {
        const idx = this.getIndexFromValue(allocID, 0);
        if (idx === null) {
            throw new Error('Invalid allocation ID');
        }

        const start = this.raw[idx + 1];
        const end = this.raw[idx + 2];
        const maxRelOffset = end - start;

        if (relOffset > maxRelOffset) {
            throw new Error('Out of allocation bounds');
        }

        return start + relOffset;
    }

    protected abstract getVertexCount(meshIndex: number): number;
    protected abstract getHeapU32(): Uint32Array;
}