import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { generateSyncHookedFunction } from '../../common/ast-utils/sync-hook/generateSyncHookedFunction.js';
import { parseFunction } from '../../common/ast-utils/parseFunction.js';

export function injectAsyncDepthHooks(recorder: WLETraceRecorder, proto: any, name: string, extraContext?: Record<string, unknown>) {
    proto[name] = generateSyncHookedFunction(
        parseFunction(proto[name]),
        () => recorder.enterHook(),
        () => recorder.leaveHook(),
        extraContext,
    );
}