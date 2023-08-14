import { type IfStatement } from 'estree';
import { mkParamlessFuncCall } from './mkParamlessFuncCall.js';
import { mkSimpleLiteral } from './mkSimpleLiteral.js';
import { mkIdentifier } from './mkIdentifier.js';
import { mkUpdateExpression } from './mkUpdateExpression.js';
import { mkBinaryExpression } from './mkBinaryExpression.js';
import { mkIfStatement } from './mkIfStatement.js';
import { mkThrowErrorStatement } from './mkThrowErrorStatement.js';

export function mkGuardedEndHookCall(hookStateName: string, endHookName: string): IfStatement {
    return mkIfStatement(
        mkBinaryExpression(
            mkUpdateExpression(mkIdentifier(hookStateName), '--', true),
            '===',
            mkSimpleLiteral(0),
        ),
        mkParamlessFuncCall(endHookName),
        mkIfStatement(
            mkBinaryExpression(mkIdentifier(hookStateName), '<', mkSimpleLiteral(0)),
            mkThrowErrorStatement('Mistmatched end hook call'),
        ),
    );
}