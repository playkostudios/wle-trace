import { type WonderlandEngine } from '@wonderlandengine/api';
import { type StyledMessage } from '../StyledMessage.js';
import { type LiteDestructionData } from './LiteDestructionData.js';
import { type TracedComponent } from './TracedComponent.js';

export type Object3DDestroyingData = [ path: StyledMessage, children: TracedObject3D[], components: TracedComponent[], destructionTrace: string | null ];

export interface TracedObject3D {
    readonly _objectId: number;
    readonly _engine: WonderlandEngine;
    __wle_trace_destroyed_data?: LiteDestructionData;
    __wle_trace_destroying_data?: Object3DDestroyingData;
}