import { badVersionErr } from './badVersionErr.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function getValuePropertyDescriptor(clazz: { prototype: any }, key: string) {
    const descriptor = getPropertyDescriptor(clazz, key);
    if (!descriptor.value) {
        throw new Error(`Property descriptor for ${clazz.constructor.name}.${key} has no value. ${badVersionErr}`);
    }

    return descriptor.value;
}
