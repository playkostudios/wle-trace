import { type Statement } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { hookIntoSyncStatementParts } from './hookIntoSyncStatementParts.js';

export function hookIntoSyncBodyParts(body: Array<Statement>, injectionContext: SyncBodyHookASTInjectionContext): void {
    for (const stmt of body) {
        hookIntoSyncStatementParts(stmt, injectionContext);
    }
}