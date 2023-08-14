import { type BlockStatement, type Statement } from 'estree';
import { statementHasAwait } from './statementHasAwait.js';
import { type SyncBodyHookASTInjectionContext } from '../types/SyncBodyHookASTInjectionContext.js';

export function hookIntoSyncBodyParts(body: Array<Statement>, injectionContext: SyncBodyHookASTInjectionContext): void {
    // TODO
}