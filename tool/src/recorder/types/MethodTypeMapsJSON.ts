import { type CallTypeJSON } from './CallTypeJSON.js';

export interface MethodTypeMapsJSON {
    version: 1;
    calls?: Record<string, CallTypeJSON>;
    callbacks?: Record<string, CallTypeJSON>;
};