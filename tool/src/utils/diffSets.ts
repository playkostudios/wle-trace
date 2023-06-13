export function diffSets(oldSet: Set<unknown>, newSet: Set<unknown>): [addedVals: Set<unknown>, removedVals: Set<unknown>, keptVals: Set<unknown>] {
    const added = new Set();
    const removed = new Set(oldSet);
    const kept = new Set();

    for (const val of newSet) {
        if (removed.has(val)) {
            removed.delete(val);
            kept.add(val);
        } else {
            added.add(val);
        }
    }

    return [added, removed, kept];
}