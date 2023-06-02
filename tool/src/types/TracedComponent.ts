import { type LiteDestructionData } from './LiteDestructionData.js';
import { type TracedObject3D } from './TracedObject3D.js';

export interface TracedComponent {
    readonly _object: TracedObject3D | null;
    readonly _id: number;
    __wle_trace_destroyed_data?: LiteDestructionData;
    __wle_trace_destroying_data?: LiteDestructionData;
}