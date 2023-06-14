/**
 * /!\ This file is auto-generated.
 *
 * This is the entry point of your standalone application.
 *
 * There are multiple tags used by the editor to inject code automatically:
 *     - `wle:auto-imports:start` and `wle:auto-imports:end`: The list of import statements
 *     - `wle:auto-register:start` and `wle:auto-register:end`: The list of component to register
 *     - `wle:auto-constants:start` and `wle:auto-constants:end`: The project's constants,
 *        such as the project's name, whether it should use the physx runtime, etc...
 *     - `wle:auto-benchmark:start` and `wle:auto-benchmark:end`: Append the benchmarking code
 */

import wleTrace from 'wle-trace';

let firstLoad = true;
wleTrace.waitForInjections(() => {
    wleTrace.enableWithPrefix('guard:');
    wleTrace.enableWithPrefix('trace:destruction:');
    wleTrace.enableWithPrefix('trace:construction:');
    // wleTrace.enableWithPrefix('trace:reclaim:')
    wleTrace.enable('breakpoint:guard-failed');
    wleTrace.enable('breakpoint:strict-guard-only');
    // wleTrace.enable('fast-trace');
    // wleTrace.enable('fast-objects');
    wleTrace.enable('destruction-traces');

    wleTrace.enableWithPrefix('trace:');
    wleTrace.disableWithPrefix('trace:WASM.');
    wleTrace.enable('trace:WASM._wljs_component_onDestroy');
    wleTrace.enable('trace:WASM._wl_load_scene_bin');
    wleTrace.disableWithPrefix('trace:Object3D.translate');
    wleTrace.disableWithPrefix('trace:Object3D.rotate');
    wleTrace.disableWithPrefix('trace:Object3D.reset');
    wleTrace.disableWithPrefix('trace:Object3D.getPosition');
    wleTrace.disableWithPrefix('trace:Object3D.getTranslation');
    wleTrace.disableWithPrefix('trace:get:Object3D.parent');
    wleTrace.disableWithPrefix('trace:get:Object3D.transform');
    wleTrace.disableWithPrefix('trace:set:Object3D.transform');
    wleTrace.disable('trace:get:Component.object');
    wleTrace.disable('trace:get:Component.active');

    return;
    if (firstLoad) {
        firstLoad = false;
        const timeoutMS = 2500;

        console.debug(`[wle-trace TEST] reloading scene in ${timeoutMS} milliseconds`);

        setTimeout(() => {
            console.debug('[wle-trace TEST] reloading scene...');
            engine.scene.load(`${Constants.ProjectName}.bin`);
        }, timeoutMS);
    }
})

/* wle:auto-imports:start */
import {MouseLookComponent} from '@wonderlandengine/components';
import {WasdControlsComponent} from '@wonderlandengine/components';
import {TestDestroy} from './test-destroy.js';
/* wle:auto-imports:end */

import {loadRuntime} from '@wonderlandengine/api';
import * as API from '@wonderlandengine/api'; // Deprecated: Backward compatibility.

/* wle:auto-constants:start */
const RuntimeOptions = {
    physx: false,
    loader: false,
    xrFramebufferScaleFactor: 1,
    canvas: 'canvas',
};
const Constants = {
    ProjectName: 'wle-trace-test-project',
    RuntimeBaseName: 'WonderlandRuntime',
    WebXRRequiredFeatures: ['local',],
    WebXROptionalFeatures: ['local','hand-tracking','hit-test',],
};
/* wle:auto-constants:end */

const engine = await loadRuntime(Constants.RuntimeBaseName, RuntimeOptions);
Object.assign(engine, API); // Deprecated: Backward compatibility.
window.WL = engine; // Deprecated: Backward compatibility.

engine.onSceneLoaded.once(() => {
    const el = document.getElementById('version');
    if (el) setTimeout(() => el.remove(), 2000);
});

/* WebXR setup. */

function requestSession(mode) {
    engine
        .requestXRSession(mode, Constants.WebXRRequiredFeatures, Constants.WebXROptionalFeatures)
        .catch((e) => console.error(e));
}

function setupButtonsXR() {
    /* Setup AR / VR buttons */
    const arButton = document.getElementById('ar-button');
    if (arButton) {
        arButton.dataset.supported = engine.arSupported;
        arButton.addEventListener('click', () => requestSession('immersive-ar'));
    }
    const vrButton = document.getElementById('vr-button');
    if (vrButton) {
        vrButton.dataset.supported = engine.vrSupported;
        vrButton.addEventListener('click', () => requestSession('immersive-vr'));
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('load', setupButtonsXR);
} else {
    setupButtonsXR();
}

/* wle:auto-register:start */
engine.registerComponent(MouseLookComponent);
engine.registerComponent(WasdControlsComponent);
engine.registerComponent(TestDestroy);
/* wle:auto-register:end */

engine.scene.load(`${Constants.ProjectName}.bin`);

/* wle:auto-benchmark:start */
/* wle:auto-benchmark:end */
