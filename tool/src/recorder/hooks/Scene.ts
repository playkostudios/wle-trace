import { Scene } from '@wonderlandengine/api';
import { fetchWithProgress } from '@wonderlandengine/api/utils/fetch.js';
import { isString } from '@wonderlandengine/api/utils/object.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectAsyncDepthHooks } from '../inject/injectAsyncDepthHooks.js';

export function injectScene(recorder: WLETraceRecorder) {
    injectAsyncDepthHooks(recorder, Scene.prototype, 'load', {
        fetchWithProgress,
    });

    injectAsyncDepthHooks(recorder, Scene.prototype, 'append', {
        fetchWithProgress, isString,
    });
}