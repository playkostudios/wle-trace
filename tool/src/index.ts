// XXX orig-properties needs to be imported first so that the unmodified
//     properties can be get
import './hooks/orig-properties.js';
export { injectWLETrace } from './hooks/injectWLETrace.js';
export { recordWLETrace } from './hooks/recordWLETrace.js';
export { WLETraceReplayer } from './WLETraceReplayer.js';
export type { WLETraceController } from './WLETraceController.js';
