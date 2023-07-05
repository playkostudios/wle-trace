import { type TypedArray } from '@wonderlandengine/api';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

const recorderMap = new WeakMap<TypedArray, WLETraceRecorder>();

const typedArrayHandler: ProxyHandler<TypedArray> = {
    set(target, p, newValue) {
        if (typeof p === 'string') {
            const num = Number(p);
            if (num >= 0 && num < target.length && Number.isInteger(num)) {
                const recorder = recorderMap.get(target);
                if (recorder) {
                    recorder.recordWASMSingleDMA(target, num, newValue as number);
                }

                Reflect.set(target, num, newValue);
            }
        }

        return true;
    },
    get(target, p) {
        const val = Reflect.get(target, p);

        if (typeof val === 'function') {
            return val.bind(target);
        } else {
            return val;
        }
    },
};

export function wrapTypedArray<T extends TypedArray>(recorder: WLETraceRecorder, array: T): T {
    if (!array) {
        throw new Error("Can't wrap an array if it doesn't exist");
    }

    const proxy = new Proxy(array, typedArrayHandler) as T;
    recorderMap.set(array, recorder);
    return proxy;
}