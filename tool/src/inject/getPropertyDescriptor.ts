import { badVersionErr } from './badVersionErr.js';

export function getPropertyDescriptor(prototype: any, key: string) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (!descriptor) {
        throw new Error(`Could not get property descriptor for ${prototype.constructor.name}.${key}. ${badVersionErr}`);
    }

    return descriptor;
}
