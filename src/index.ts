// XXX orig-properties needs to be imported first so that the unmodified
//     properties can be get
import './orig-properties.js';
import './Object3D.js';
import './Component.js';
import './MeshComponent.js';
import './Scene.js';
import { controller } from './WLETraceController.js';
import type { WLETraceController } from './WLETraceController.js';

declare global {
    var wleTrace: WLETraceController;
}

globalThis.wleTrace = controller;

export default controller;