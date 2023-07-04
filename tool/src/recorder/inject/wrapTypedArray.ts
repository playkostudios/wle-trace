import { type TypedArray } from '@wonderlandengine/api';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

const recorderMap = new WeakMap<TypedArray, WLETraceRecorder>();

const typedArrayHandler: ProxyHandler<TypedArray> = {
    set(target, p, newValue, _receiver) {
        if (typeof p === 'string') {
            const num = Number(p);
            if (num >= 0 && num < target.length && Number.isInteger(num)) {
                const recorder = recorderMap.get(target);
                if (recorder) {
                    recorder.recordWASMSingleDMA(target, num, newValue as number);
                }
            }
        }

        (target as Record<string | symbol, any>)[p] = newValue;
        return true;
    },
    get(target, p, _receiver) {
        const val = (target as Record<string | symbol, any>)[p];

        if (typeof val === 'function') {
            return val.bind(target);
        } else {
            return val;
        }
    },
    ownKeys(target) {
        return Reflect.ownKeys(target);
    }
};

export function wrapTypedArray<T extends TypedArray>(recorder: WLETraceRecorder, array: T): T {
    if (!array) {
        throw new Error("Can't wrap an array if it doesn't exist");
    }

    const proxy = new Proxy(array, typedArrayHandler) as T;
    recorderMap.set(array, recorder);
    return proxy;
}