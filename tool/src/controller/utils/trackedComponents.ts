import { type TracedComponent } from '../types/TracedComponent.js';
import { Tracker } from './Tracker.js';

export const trackedComponents = new Tracker<TracedComponent>();
