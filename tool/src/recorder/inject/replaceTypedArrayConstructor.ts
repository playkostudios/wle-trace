import { type TypedArrayCtor } from '@wonderlandengine/api';
import { replaceGlobalConstructor } from '../../common/inject/replaceGlobalConstructor.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { wrapTypedArray } from './wrapTypedArray.js';

export function replaceTypedArrayConstructor(recorder: WLETraceRecorder, clazz: TypedArrayCtor) {
    const className = clazz.name;
    type instanceType = InstanceType<TypedArrayCtor>;

    replaceGlobalConstructor(className, function(this: instanceType, origCtor: { new (...args: any[]): instanceType }, args: any[]) {
            const array = new origCtor(...args);
            let instance = array;

            if (recorder.isHeapBuffer(array.buffer) && recorder.recording) {
                instance = wrapTypedArray(recorder, array);
                // console.debug('!!! replaced instance', instance, array);
            }

            return instance;
        }
    );
}