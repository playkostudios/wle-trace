import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { makePassthroughHandler } from '../inject/passthroughHandler.js';

export class WebGL2RenderingContextWrapper {
    constructor(private _wletrace_recorder: WLETraceRecorder, private _wletrace_context: WebGL2RenderingContext) {}

    static create(recorder: WLETraceRecorder, origContext: WebGL2RenderingContext): WebGL2RenderingContext {
        return new Proxy<WebGL2RenderingContext>(
            new WebGL2RenderingContextWrapper(recorder, origContext) as unknown as WebGL2RenderingContext,
            makePassthroughHandler(
                new Set([
                ]),
                origContext,
            )
        );
    }
}