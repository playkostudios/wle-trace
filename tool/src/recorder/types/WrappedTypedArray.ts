import { type TypedArray } from '@wonderlandengine/api';
import { TYPED_ARRAY_UNWRAP_KEY } from '../inject/wrapTypedArray.js';

export interface WrappedTypedArray {
    [TYPED_ARRAY_UNWRAP_KEY]: TypedArray;
}