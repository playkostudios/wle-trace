// XXX orig-properties needs to be imported first so that the unmodified
//     properties can be get
import './hooks/orig-properties.js';
import './hooks/Mesh.js';
import './hooks/Object3D.js';
import './hooks/Component.js';
import './hooks/MeshComponent.js';
import './hooks/Scene.js';
import { controller } from './WLETraceController.js';
import type { WLETraceController } from './WLETraceController.js';

declare global {
    var wleTrace: WLETraceController;
}

globalThis.wleTrace = controller;

export default controller;
export * from './StyledMessage.js';