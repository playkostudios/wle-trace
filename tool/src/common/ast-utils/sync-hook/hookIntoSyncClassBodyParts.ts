import { type ClassBody } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { hookIntoSyncStatementParts } from './hookIntoSyncStatementParts.js';
import { hookIntoSyncExpressionParts } from './hookIntoSyncExpressionParts.js';

export function hookIntoSyncClassBodyParts(classBody: ClassBody, injectionContext: SyncBodyHookASTInjectionContext) {
    for (const classPart of classBody.body) {
        if (classPart.type === 'StaticBlock') {
            hookIntoSyncStatementParts(classPart, injectionContext);
        } else {
            if (classPart.key.type !== 'PrivateIdentifier') {
                hookIntoSyncExpressionParts(classPart.key, injectionContext);
            }
            if (classPart.value) {
                hookIntoSyncExpressionParts(classPart.value, injectionContext);
            }
        }
    }
}