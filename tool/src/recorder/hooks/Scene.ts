import { Scene } from '@wonderlandengine/api';
import { injectAsyncDepthHooks } from '../inject/injectAsyncDepthHooks.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

export function injectScene(recorder: WLETraceRecorder) {
    injectAsyncDepthHooks(recorder, Scene.prototype, 'load');
    injectAsyncDepthHooks(recorder, Scene.prototype, 'append');
}