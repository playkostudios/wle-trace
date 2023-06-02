import { badVersionErr } from './badVersionErr.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function getGetterPropertyDescriptor(prototype: any, key: string) {
    const descriptor = getPropertyDescriptor(prototype, key);
    if (!descriptor.get) {
        throw new Error(`Property descriptor for ${prototype.constructor.name}.${key} has no getter. ${badVersionErr}`);
    }

    return descriptor.get;
}
