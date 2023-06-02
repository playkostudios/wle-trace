import { badVersionErr } from './badVersionErr.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function getValuePropertyDescriptor(prototype: any, key: string) {
    const descriptor = getPropertyDescriptor(prototype, key);
    if (!descriptor.value) {
        throw new Error(`Property descriptor for ${prototype.constructor.name}.${key} has no value. ${badVersionErr}`);
    }

    return descriptor.value;
}
