import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { makePassthroughHandler } from '../inject/passthroughHandler.js';
import { TYPED_ARRAY_UNWRAP_KEY } from '../inject/wrapTypedArray.js';
import { type WrappedTypedArray } from '../types/WrappedTypedArray.js';

export const RENDERING_CONTEXT_RECORDER_KEY = Symbol('wle-trace-RenderingContext-recorder');
export const RENDERING_CONTEXT_UNWRAP_KEY = Symbol('wle-trace-RenderingContext-unwrap');
export const RENDERING_CONTEXT_UNWRAP_TYPED_ARRAYS_KEY = Symbol('wle-trace-RenderingContext-unwrapTypedArrays');

export class WebGL2RenderingContextWrapper {
    [RENDERING_CONTEXT_RECORDER_KEY]: WLETraceRecorder;
    [RENDERING_CONTEXT_UNWRAP_KEY]: WebGL2RenderingContext;

    constructor(recorder: WLETraceRecorder, context: WebGL2RenderingContext) {
        this[RENDERING_CONTEXT_RECORDER_KEY] = recorder;
        this[RENDERING_CONTEXT_UNWRAP_KEY] = context;
    }

    [RENDERING_CONTEXT_UNWRAP_TYPED_ARRAYS_KEY](args: Array<any>, unwrapIdxs: Array<number>) {
        for (const idx of unwrapIdxs) {
            const val = args[idx];
            if (val && val.buffer && this[RENDERING_CONTEXT_RECORDER_KEY].isHeapBuffer(val.buffer)) {
                const newVal = (val as unknown as WrappedTypedArray)[TYPED_ARRAY_UNWRAP_KEY];
                if (newVal) {
                    args[idx] = newVal;
                }
            }
        }
    }

    bufferSubData(...args: Parameters<WebGL2RenderingContext['bufferSubData']>) {
        this[RENDERING_CONTEXT_UNWRAP_TYPED_ARRAYS_KEY](args, [2]);
        const ctx = this[RENDERING_CONTEXT_UNWRAP_KEY];
        return ctx.bufferSubData.apply(ctx, args);
    }

    texSubImage2D(...args: Parameters<WebGL2RenderingContext['texSubImage2D']>) {
        this[RENDERING_CONTEXT_UNWRAP_TYPED_ARRAYS_KEY](args, [8]);
        const ctx = this[RENDERING_CONTEXT_UNWRAP_KEY];
        return ctx.texSubImage2D.apply(ctx, args);
    }

    texSubImage3D(...args: Parameters<WebGL2RenderingContext['texSubImage3D']>) {
        this[RENDERING_CONTEXT_UNWRAP_TYPED_ARRAYS_KEY](args, [10]);
        const ctx = this[RENDERING_CONTEXT_UNWRAP_KEY];
        return ctx.texSubImage3D.apply(ctx, args);
    }

    static create(recorder: WLETraceRecorder, origContext: WebGL2RenderingContext): WebGL2RenderingContext {
        const overrides = new Set<string>();
        for (const name of Object.getOwnPropertyNames(WebGL2RenderingContextWrapper.prototype)) {
            if (name !== 'constructor') {
                overrides.add(name);
            }
        }

        return new Proxy<WebGL2RenderingContext>(
            new WebGL2RenderingContextWrapper(recorder, origContext) as unknown as WebGL2RenderingContext,
            makePassthroughHandler(overrides, origContext),
        );
    }
}