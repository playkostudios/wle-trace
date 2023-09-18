export function makePassthroughHandler<T extends object>(overridden: Set<string | symbol>, origObj: T): ProxyHandler<T> {
    return {
        get(target, p) {
            if (overridden.has(p)) {
                return Reflect.get(target, p);
            } else {
                return Reflect.get(origObj, p);
            }
        },
        set(target, p, newValue) {
            if (overridden.has(p)) {
                return Reflect.set(target, p, newValue);
            } else {
                return Reflect.set(origObj, p, newValue);
            }
        },
    };
};