import { type BaseASTInjectionContext } from '../../types/BaseASTInjectionContext.js';

export function mkTempIdentifierName(injectionContext: BaseASTInjectionContext) {
    return `__wleTrace_tmp${injectionContext.tmpCount++}`;
}