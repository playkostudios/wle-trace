import { badVersionErr } from './badVersionErr.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function getGetterPropertyDescriptor(clazz: { prototype: any }, key: string) {
    const descriptor = getPropertyDescriptor(clazz, key);
    if (!descriptor.get) {
        throw new Error(`Property descriptor for ${clazz.constructor.name}.${key} has no getter. ${badVersionErr}`);
    }

    return descriptor.get;
}
