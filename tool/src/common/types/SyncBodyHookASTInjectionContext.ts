import { type BaseASTInjectionContext } from './BaseASTInjectionContext.js';

export interface SyncBodyHookASTInjectionContext extends BaseASTInjectionContext {
    hookStateName: string,
    startHookName: string,
    endHookName: string,
    awaitHookName: string,
}