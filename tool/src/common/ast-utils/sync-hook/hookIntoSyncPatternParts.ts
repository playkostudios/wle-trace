import { type Pattern } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { hookIntoSyncExpressionParts } from './hookIntoSyncExpressionParts.js';

export function hookIntoSyncPatternParts(ptrn: Pattern, injectionContext: SyncBodyHookASTInjectionContext): void {
    switch (ptrn.type) {
        case 'Identifier':
            break;
        case 'ObjectPattern':
            for (const prop of ptrn.properties) {
                if (prop.type === 'RestElement') {
                    hookIntoSyncPatternParts(prop.argument, injectionContext);
                } else {
                    if (prop.key.type !== 'PrivateIdentifier') {
                        hookIntoSyncExpressionParts(prop.key, injectionContext);
                    }

                    hookIntoSyncPatternParts(prop.value, injectionContext);
                }
            }
            break;
        case 'ArrayPattern':
            for (const subPattern of ptrn.elements) {
                if (subPattern) {
                    hookIntoSyncPatternParts(subPattern, injectionContext);
                }
            }
            break;
        case 'RestElement':
            hookIntoSyncPatternParts(ptrn.argument, injectionContext);
            break;
        case 'AssignmentPattern':
            hookIntoSyncPatternParts(ptrn.left, injectionContext);
            hookIntoSyncExpressionParts(ptrn.right, injectionContext);
            break;
        case 'MemberExpression':
            if (ptrn.property.type !== 'PrivateIdentifier') {
                hookIntoSyncExpressionParts(ptrn.property, injectionContext);
            }
            break;
    }
}
