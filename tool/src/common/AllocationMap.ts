// TODO is it correct to deallocate overlapping memory ranges?

export class AllocationMap {
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

    allocate(start: number, end: number): number {
        if (start === end) {
            throw new Error("Allocation failed; zero-length allocation");
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
}