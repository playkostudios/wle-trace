import { type Statement, type BlockStatement } from 'estree';
import { hookIntoSyncBodyParts } from './hookIntoSyncBodyParts.js';
import { makeTempIdentifierName } from './makeTempIdentifierName.js';
import { type SyncBodyHookASTInjectionContext } from '../types/SyncBodyHookASTInjectionContext.js';
import { makeVariableDeclaration } from './makeVariableDeclaration.js';
import { makeParamlessFuncCall } from './makeParamlessFuncCall.js';
import { makeSimpleLiteralAssignmentStatement } from './makeSimpleLiteralAssignmentStatement.js';

/**
 * Equivalent to:
 * ```js
 * let __wleTrace_tmp0 = false;
 * startHook();
 * __wleTrace_tmp0 = true;
 * try {
 *     let regular = "code";
 *     let goes = 'here';
 *     let asyncResponse = await awaitHook(actualAwaitFunc());
 *     let more = "code";
 *     let here = 'comes';
 * } finally {
 *     if (__wleTrace_hooked) {
 *         endHook();
 *     }
 * }
 * ```
 */
export function hookIntoSyncTopBlockParts(block: BlockStatement, injectionContext: SyncBodyHookASTInjectionContext | null = null): [hookedBlock: BlockStatement, injectionContext: SyncBodyHookASTInjectionContext] {
    let hookStateAlreadyDeclared = true;
    if (injectionContext === null) {
        const baseInjectionContext = {
            tmpCount: 0,
        };

        const hookStateName = makeTempIdentifierName(baseInjectionContext);
        const startHookName = makeTempIdentifierName(baseInjectionContext);
        const endHookName = makeTempIdentifierName(baseInjectionContext);
        const awaitHookName = makeTempIdentifierName(baseInjectionContext);

        injectionContext = {
            ...baseInjectionContext,
            hookStateName, startHookName, endHookName, awaitHookName,
        };

        hookStateAlreadyDeclared = false;
    }

    hookIntoSyncBodyParts(block.body, injectionContext);

    const hookedBlockBody = new Array<Statement>();

    if (!hookStateAlreadyDeclared) {
        hookedBlockBody.push(
            makeVariableDeclaration(injectionContext.hookStateName, 'let', {
                type: 'Literal',
                value: false,
            })
        );
    }

    hookedBlockBody.push(
        makeParamlessFuncCall(injectionContext.startHookName),
        makeSimpleLiteralAssignmentStatement(injectionContext.hookStateName, true),
        {
            type: 'TryStatement',
            block,
            finalizer: {
                type: 'BlockStatement',
                body: [
                    {
                        type: 'IfStatement',
                        test: {
                            type: 'Identifier',
                            name: injectionContext.hookStateName,
                        },
                        consequent: {
                            type: 'BlockStatement',
                            body: [
                                makeParamlessFuncCall(injectionContext.endHookName),
                            ],
                        },
                    },
                ],
            },
        },
    );

    return [
        {
            type: 'BlockStatement',
            body: hookedBlockBody,
        },
        injectionContext,
    ];
}