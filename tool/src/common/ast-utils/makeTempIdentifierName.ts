import { type BaseASTInjectionContext } from '../types/BaseASTInjectionContext.js';

export function makeTempIdentifierName(injectionContext: BaseASTInjectionContext) {
    return `__wleTrace_tmp${injectionContext.tmpCount++}`;
}