import { finalizeReplaceableReturnHookOptions, type ReplaceableReturnHookOptions } from './ReplaceableReturnHookOptions.js';
import { addHooksToMember, type BaseHookOptions } from './addHooksToMember.js';
import { badVersionErr } from './badVersionErr.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function injectAccessor(prototype: any, accessorName: string, getterOptions?: ReplaceableReturnHookOptions | null, setterOptions?: BaseHookOptions | null) {
    const descriptor = getPropertyDescriptor(prototype, accessorName);
    const getOrig = descriptor.get;
    const setOrig = descriptor.set;

    if (!(getOrig || setOrig)) {
        throw new Error(`Property descriptor for ${prototype.constructor.name}.${accessorName} is not an accessor. ${badVersionErr}`);
    }

    const finalGetterOptions = finalizeReplaceableReturnHookOptions(getterOptions);
    if (!(finalGetterOptions || setterOptions)) {
        console.warn('This accessor was injected with no hooks. Either stop injecting it or add hooks');
        return;
    }

    let newGet;
    if (finalGetterOptions) {
        if (!getOrig) {
            throw new Error(`Property descriptor for accessor ${prototype.constructor.name}.${accessorName} has no getter. ${badVersionErr}`);
        }

        newGet = addHooksToMember(getOrig, accessorName, finalGetterOptions) as () => any;
    }

    let newSet;
    if (setterOptions) {
        if (!setOrig) {
            throw new Error(`Property descriptor for accessor ${prototype.constructor.name}.${accessorName} has no setter. ${badVersionErr}`);
        }

        newSet = addHooksToMember(setOrig, accessorName, setterOptions) as (v: any) => void;
    }

    Object.defineProperty(prototype, accessorName, {
        ...descriptor,
        get: newGet,
        set: newSet
    });
}