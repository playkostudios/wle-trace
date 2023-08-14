import { type IfStatement } from 'estree';
import { mkParamlessFuncCall } from './mkParamlessFuncCall.js';
import { mkSimpleLiteral } from './mkSimpleLiteral.js';
import { mkIdentifier } from './mkIdentifier.js';
import { mkUpdateExpression } from './mkUpdateExpression.js';
import { mkBinaryExpression } from './mkBinaryExpression.js';
import { mkIfStatement } from './mkIfStatement.js';

export function mkGuardedStartHookCall(hookStateName: string, startHookName: string): IfStatement {
    return mkIfStatement(
        mkBinaryExpression(
            mkUpdateExpression(mkIdentifier(hookStateName), '++', false),
            '===',
            mkSimpleLiteral(0),
        ),
        mkParamlessFuncCall(startHookName),
    );
}