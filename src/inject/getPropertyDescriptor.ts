import { badVersionErr } from './badVersionErr.js';

export function getPropertyDescriptor(clazz: { prototype: any }, key: string) {
    const descriptor = Object.getOwnPropertyDescriptor(clazz.prototype, key);
    if (!descriptor) {
        throw new Error(`Could not get property descriptor for ${clazz.constructor.name}.${key}. ${badVersionErr}`);
    }

    return descriptor;
}
