import { type Statement } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { mkGuardedStartHookCall } from '../factory/mkGuardedStartHookCall.js';
import { mkFinalizerGuard } from '../factory/mkFinalizerGuard.js';
import { mkBlockStatement } from '../factory/mkBlockStatement.js';
import { mkGuardedEndHookCall } from '../factory/mkGuardedEndHookCall.js';

export function hookIntoSyncFuncSubBlockParts(body: Statement[], injectionContext: SyncBodyHookASTInjectionContext) {
    const subBody = [...body];
    body.splice(
        0, body.length,
        mkGuardedStartHookCall(injectionContext.hookStateName, injectionContext.startHookName),
        mkFinalizerGuard(
            mkBlockStatement(subBody),
            mkBlockStatement([
                mkGuardedEndHookCall(injectionContext.hookStateName, injectionContext.endHookName),
            ]),
        ),
    );
}