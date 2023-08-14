import { type Statement, type BlockStatement } from 'estree';
import { hookIntoSyncBodyParts } from './hookIntoSyncBodyParts.js';
import { mkTempIdentifierName } from './mkTempIdentifierName.js';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { mkSimpleVariableDeclaration } from '../factory/mkSimpleVariableDeclaration.js';
import { mkParamlessFuncCall } from '../factory/mkParamlessFuncCall.js';
import { mkSimpleLiteralAssignmentStatement } from '../factory/mkSimpleLiteralAssignmentStatement.js';
import { mkGuardedEndHookCall } from '../factory/mkGuardedEndHookCall.js';
import { mkGuardedStartHookCall } from '../factory/mkGuardedStartHookCall.js';
import { mkSimpleLiteral } from '../factory/mkSimpleLiteral.js';
import { mkIdentifier } from '../factory/mkIdentifier.js';
import { mkBinaryExpression } from '../factory/mkBinaryExpression.js';
import { mkIfStatement } from '../factory/mkIfStatement.js';
import { mkFinalizerGuard } from '../factory/mkFinalizerGuard.js';
import { mkBlockStatement } from '../factory/mkBlockStatement.js';
import { mkReturnStatement } from '../factory/mkReturnStatement.js';

/**
 * Equivalent to:
 * ```js
 * let __wleTrace_tmp0 = 0;
 * async function __wleTrace_tmp1(x) {
 *     if (--__wleTrace_tmp0 === 0) {
 *         endHook();
 *     } else if (__wleTrace_tmp0 < 0) {
 *         throw new Error("Mistmatched end hook call");
 *     }
 *     try {
 *         return await x;
 *     } finally {
 *         if (__wleTrace_tmp0++ === 0) {
 *             startHook();
 *         }
 *     }
 * }
 * startHook();
 * __wleTrace_tmp0 = 1;
 * try {
 *     let regular = "code";
 *     let goes = 'here';
 *     let asyncResponse = await awaitHook(actualAwaitFunc());
 *     let more = "code";
 *     let here = 'comes';
 * } finally {
 *     if (__wleTrace_tmp0 > 0) {
 *         endHook();
 *     }
 * }
 * ```
 *
 * Note that nested function declarations will also be hooked into.
 */
export function hookIntoSyncTopBlockParts(block: BlockStatement, injectionContext: SyncBodyHookASTInjectionContext | null = null): [hookedBlock: BlockStatement, injectionContext: SyncBodyHookASTInjectionContext] {
    let hookStateAlreadyDeclared = true;
    if (injectionContext === null) {
        const baseInjectionContext = {
            tmpCount: 0,
        };

        const hookStateName = mkTempIdentifierName(baseInjectionContext);
        const startHookName = mkTempIdentifierName(baseInjectionContext);
        const endHookName = mkTempIdentifierName(baseInjectionContext);
        const awaitHookName = mkTempIdentifierName(baseInjectionContext);

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
            mkSimpleVariableDeclaration(injectionContext.hookStateName, 'let', mkSimpleLiteral(false)),
            {
                type: 'FunctionDeclaration',
                async: true,
                id: mkIdentifier(injectionContext.awaitHookName),
                params: [ mkIdentifier('x') ],
                body: mkBlockStatement([
                    mkGuardedEndHookCall(injectionContext.hookStateName, injectionContext.endHookName),
                    mkFinalizerGuard(
                        mkBlockStatement([
                            mkReturnStatement({
                                type: 'AwaitExpression',
                                argument: mkIdentifier('x'),
                            }),
                        ]),
                        mkBlockStatement([
                            mkGuardedStartHookCall(injectionContext.hookStateName, injectionContext.startHookName),
                        ]),
                    ),
                ]),
            },
        );
    }

    hookedBlockBody.push(
        mkParamlessFuncCall(injectionContext.startHookName),
        mkSimpleLiteralAssignmentStatement(injectionContext.hookStateName, true),
        mkFinalizerGuard(block, mkBlockStatement([
            mkIfStatement(
                mkBinaryExpression(
                    mkIdentifier(injectionContext.hookStateName),
                    '>',
                    mkSimpleLiteral(0),
                ),
                mkBlockStatement([
                    mkParamlessFuncCall(injectionContext.endHookName),
                ]),
            ),
        ])),
    );

    return [ mkBlockStatement(hookedBlockBody), injectionContext ];
}