import type { Component } from '@wonderlandengine/api';
import type { LiteDestructionData } from './LiteDestructionData.js';

export interface TracedComponent extends Component {
    __wle_trace_destroyed_data?: LiteDestructionData;
    __wle_trace_destroying_data?: LiteDestructionData;
}