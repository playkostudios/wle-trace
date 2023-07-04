import { finalizeReplaceableReturnHookOptions, type ReplaceableReturnHookOptions } from './ReplaceableReturnHookOptions.js';
import { addHooksToMember } from './addHooksToMember.js';
import { getPropertyDescriptor } from './getPropertyDescriptor.js';

export function injectMethod(prototype: any, methodName: string, options: ReplaceableReturnHookOptions) {
    const descriptor = getPropertyDescriptor(prototype, methodName);
    Object.defineProperty(prototype, methodName, {
        ...descriptor,
        value: addHooksToMember(descriptor.value, methodName, finalizeReplaceableReturnHookOptions(options))
    });
}
