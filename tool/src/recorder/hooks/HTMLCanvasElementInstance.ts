import { curryFunction } from '../../common/inject/curryFunction.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { WebGL2RenderingContextWrapper } from './WebGL2RenderingContextWrapper.js';

function getContextWrapper(this: HTMLCanvasElement, recorder: WLETraceRecorder, getContextOrig: Function, contextId: string, options?: any): RenderingContext | null {
    const retVal = getContextOrig.call(this, contextId, options);

    if (retVal) {
        if (contextId === 'webgl') {
            throw new Error('WebGL1 wrapper not implemented yet'); // TODO
        } else if (contextId === 'webgl2') {
            return WebGL2RenderingContextWrapper.create(recorder, retVal);
        }
    }

    return retVal;
};

export function injectCanvasInstance(recorder: WLETraceRecorder, injectedCanvas: HTMLCanvasElement) {
    injectedCanvas.getContext = curryFunction(getContextWrapper, [recorder, injectedCanvas.getContext]);
}