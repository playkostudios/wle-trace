export function makePassthroughHandler<T extends object>(overridden: Set<string | symbol>, origObj: T): ProxyHandler<T> {
    return {
        get(target, p) {
            let retVal, wantedThis;
            if (overridden.has(p)) {
                retVal = Reflect.get(target, p);
                wantedThis = target;
            } else {
                retVal = Reflect.get(origObj, p);
                wantedThis = origObj;
            }

            if (typeof retVal === 'function') {
                return retVal.bind(wantedThis);
            } else {
                return retVal;
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