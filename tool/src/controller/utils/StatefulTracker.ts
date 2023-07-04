import { type WonderlandEngine } from '@wonderlandengine/api';

export class StatefulTracker<K, V> {
    private engines = new Map<WonderlandEngine, Map<K, V>>();

    set(engine: WonderlandEngine, key: K, val: V) {
        let tracked = this.engines.get(engine);
        if (tracked === undefined) {
            this.engines.set(engine, new Map([[key, val]]));
        } else {
            tracked.set(key, val);
        }
    }

    has(engine: WonderlandEngine, key: K): boolean {
        const tracked = this.engines.get(engine);
        if (tracked === undefined) {
            return false;
        } else {
            return tracked.has(key);
        }
    }

    get(engine: WonderlandEngine, key: K): V | undefined {
        const tracked = this.engines.get(engine);
        if (tracked === undefined) {
            return undefined;
        } else {
            return tracked.get(key);
        }
    }

    getAll(engine: WonderlandEngine): Iterable<[K, V]> {
        return this.engines.get(engine) ?? [];
    }
}