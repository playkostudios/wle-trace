import { injectWASM } from './WASM.js';
import { injectWonderlandEngine } from './WonderlandEngine.js';
import { injectMaterial } from './Material.js';
import { injectMesh } from './Mesh.js';
import { injectTexture } from './Texture.js';
import { injectObject3D } from './Object3D.js';
import { injectComponent } from './Component.js';
import { injectMeshComponent } from './MeshComponent.js';
import { injectScene } from './Scene.js';
import { WLETraceController } from '../WLETraceController.js';

export async function injectWLETrace(): Promise<WLETraceController> {
    const controller = new WLETraceController();

    // common features that are specific to normal mode
    controller.registerFeature('guard:methods');
    controller.registerFeature('guard:setters');
    controller.registerFeature('guard:Object3D');
    controller.registerFeature('debug:ghost:Object3D');
    controller.registerFeature('guard:Component');
    controller.registerFeature('debug:ghost:Component');
    controller.registerFeature('guard:Mesh');
    controller.registerFeature('guard:Material');
    controller.registerFeature('guard:Texture');
    controller.registerFeature('trace:reclaim:Object3D');
    controller.registerFeature('trace:reclaim:Component');
    controller.registerFeature('guard:bad-reclaim:Object3D');
    controller.registerFeature('guard:bad-reclaim:Component');
    controller.registerFeature('guard:near-id-limit:Material');
    controller.registerFeature('trace:construction:Object3D');
    controller.registerFeature('construction:Object3D');
    controller.registerFeature('trace:construction:Component');
    controller.registerFeature('construction:Component');
    controller.registerFeature('trace:construction:Mesh');
    controller.registerFeature('construction:Mesh');
    controller.registerFeature('trace:construction:Texture');
    controller.registerFeature('construction:Texture');
    controller.registerFeature('trace:construction:Material');
    controller.registerFeature('construction:Material');
    controller.registerFeature('debug:unexpected-reclaim:Texture');
    controller.registerFeature('trace:reclaim:Texture');
    controller.registerFeature('debug:unexpected-reclaim:Mesh');
    controller.registerFeature('trace:destruction:Component');
    controller.registerFeature('destruction-traces');
    controller.registerFeature('trace:destruction:Object3D');
    controller.registerFeature('breakpoint:guard-failed');
    controller.registerFeature('breakpoint:destruction:Object3D');
    controller.registerFeature('breakpoint:destruction:Component');
    controller.registerFeature('breakpoint:destruction:Mesh');
    controller.registerFeature('breakpoint:destruction:Texture');
    controller.registerFeature('breakpoint:construction:Object3D');
    controller.registerFeature('breakpoint:construction:Component');
    controller.registerFeature('breakpoint:construction:Mesh');
    controller.registerFeature('breakpoint:construction:Texture');
    controller.registerFeature('breakpoint:construction:Material');
    controller.registerFeature('breakpoint:strict-guard-only');
    controller.registerFeature('trace-sentinel');

    controller.handleFeatureToggle('trace-sentinel', (_id: string, isOn: boolean) => {
        if (!isOn) {
            controller.clearTraceQueue();
        }
    });

    injectWASM(controller);
    const promise = injectWonderlandEngine(controller);
    injectMaterial(controller);
    injectMesh(controller);
    injectTexture(controller);
    injectObject3D(controller);
    injectComponent(controller);
    injectMeshComponent(controller);
    injectScene(controller);

    await promise;

    return controller;
}