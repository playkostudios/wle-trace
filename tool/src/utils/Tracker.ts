import { type WonderlandEngine } from '@wonderlandengine/api';

export class Tracker<T> {
    private engines = new Map<WonderlandEngine, Set<T>>();

    add(engine: WonderlandEngine, val: T) {
        let tracked = this.engines.get(engine);
        if (tracked === undefined) {
            this.engines.set(engine, new Set([val]));
        } else {
            tracked.add(val);
        }
    }

    has(engine: WonderlandEngine, val: T): boolean {
        const tracked = this.engines.get(engine);
        if (tracked === undefined) {
            return false;
        } else {
            return tracked.has(val);
        }
    }

    getAll(engine: WonderlandEngine): Set<T> {
        return this.engines.get(engine) ?? new Set();
    }
}