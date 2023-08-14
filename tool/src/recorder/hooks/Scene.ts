import { Scene } from '@wonderlandengine/api';
import { fetchWithProgress } from '@wonderlandengine/api/utils/fetch.js';
import { isString } from '@wonderlandengine/api/utils/object.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { parseFunction } from '../../common/ast-utils/parseFunction.js';
import { generateSyncHookedFunction } from '../../common/ast-utils/sync-hook/generateSyncHookedFunction.js';

function injectSceneLoad(_recorder: WLETraceRecorder) {
    const ast = parseFunction(Scene.prototype.load);
    console.debug(ast);
    Scene.prototype.load = generateSyncHookedFunction(
        ast,
        () => console.debug('start hook'),
        () => console.debug('end hook'),
        {
            fetchWithProgress,
        },
    );
    console.debug('!!!', Scene.prototype.load)
}

function injectSceneAppend(_recorder: WLETraceRecorder) {
    const ast = parseFunction(Scene.prototype.append);
    Scene.prototype.append = generateSyncHookedFunction(
        ast,
        () => console.debug('start hook'),
        () => console.debug('end hook'),
        {
            fetchWithProgress, isString,
        },
    );
}

export function injectScene(recorder: WLETraceRecorder) {
    injectSceneLoad(recorder);
    injectSceneAppend(recorder);



    // injectAsyncDepthHooks(recorder, Scene.prototype, 'load');
    // injectAsyncDepthHooks(recorder, Scene.prototype, 'append');
}