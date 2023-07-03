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

import { WLETraceReplayer, injectWLETrace, recordWLETrace } from '@playkostudios/wle-trace';
import {loadRuntime} from '@wonderlandengine/api';
import * as API from '@wonderlandengine/api'; // Deprecated: Backward compatibility.
import * as wleTypeMaps from './wleTypeMaps.json';

/* wle:auto-imports:start */
import {MouseLookComponent} from '@wonderlandengine/components';
import {WasdControlsComponent} from '@wonderlandengine/components';
import {TestDestroy} from './test-destroy.js';
/* wle:auto-imports:end */

function testSentinel() {
    injectWLETrace().then((wleTrace) => {
        wleTrace.enableWithPrefix('trace:WASM.');
        wleTrace.enable('fast-trace');
        wleTrace.enable('fast-objects');
        wleTrace.enable('trace-sentinel');

        setTimeout(() => {throw new Error('i crashed your game')}, 5000);

        normalPostLoad();
    });

    normalLoadRuntime();
}

function testResourceManagement() {
    injectWLETrace().then((wleTrace) => {
        window.wleTrace = wleTrace;

        wleTrace.enableWithPrefix('guard:');
        wleTrace.enableWithPrefix('trace:destruction:');
        wleTrace.enableWithPrefix('trace:construction:');
        wleTrace.enableWithPrefix('trace:reclaim:')
        wleTrace.enable('breakpoint:guard-failed');
        wleTrace.enable('breakpoint:strict-guard-only');
        // wleTrace.enable('fast-trace');
        // wleTrace.enable('fast-objects');
        wleTrace.enable('destruction-traces');
        wleTrace.enableWithPrefix('debug:');

        normalPostLoad();
    });

    normalLoadRuntime();
}

function testRecord() {
    recordWLETrace(wleTypeMaps).then((wleTrace) => {
        setTimeout(() => wleTrace.stopAndDownload(), 5000);

        normalPostLoad();
    });

    normalLoadRuntime();
}

async function testReplay() {
    const replayer = await WLETraceReplayer.fromPopupUploadedRuntime();
    replayer.startFromUploadPopup();
}

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

let engine;

// testSentinel();
// testResourceManagement();
// testRecord();
testReplay();

async function normalLoadRuntime() {
    engine = await loadRuntime(Constants.RuntimeBaseName, {...RuntimeOptions, threads: false});
    Object.assign(engine, API); // Deprecated: Backward compatibility.
    window.WL = engine; // Deprecated: Backward compatibility.
}

async function normalPostLoad() {
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
}