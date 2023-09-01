import { finalizeReplaceableReturnHookOptions } from '../../common/inject/ReplaceableReturnHookOptions.js';
import { addHooksToMember } from '../../common/inject/addHooksToMember.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

export function makeOutOfPlaceRecorderHook(isCall: boolean, recorder: WLETraceRecorder, methodName: string, func: Function) {
    return addHooksToMember(func, methodName, finalizeReplaceableReturnHookOptions({
        beforeHook: (_unusedThis: never, methodName: string, args: any[]) => {
            recorder.recordWASMGenericCallEnter(isCall, methodName, args);
        },
        afterHook: (_unusedThis: never, methodName: string, args: any[], retVal: any) => {
            recorder.recordWASMGenericCallLeave(isCall, methodName, args, false, retVal);
        },
        exceptionHook: (_unusedThis: never, methodName: string, args: any[], _err: unknown) => {
            recorder.recordWASMGenericCallLeave(isCall, methodName, args, true);
        }
    }))
}