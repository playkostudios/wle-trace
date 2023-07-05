import { type TypedArrayCtor } from '@wonderlandengine/api';
import { replaceScopedConstructor } from '../../common/inject/replaceScopedConstructor.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { wrapTypedArray } from './wrapTypedArray.js';

export function replaceTypedArrayConstructor<T extends TypedArrayCtor>(recorder: WLETraceRecorder, clazz: T) {
    type V = InstanceType<T>;

    replaceScopedConstructor(globalThis, clazz.name, (newInstance: V, _args: any[]): V | undefined => {
        if (recorder.isHeapBuffer(newInstance.buffer) && recorder.recording) {
            return wrapTypedArray(recorder, newInstance);
        } else {
            return;
        }
    });
}