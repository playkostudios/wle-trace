import { type ValueTypeJSON } from './ValueTypeJSON.js';

export interface CallTypeJSON {
    args: Array<ValueTypeJSON>;
    ret?: ValueTypeJSON;
};