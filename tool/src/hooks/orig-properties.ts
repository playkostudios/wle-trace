import { Component, Object3D } from '@wonderlandengine/api';
import { getGetterPropertyDescriptor } from '../inject/getGetterPropertyDescriptor.js';
import { getValuePropertyDescriptor } from '../inject/getValuePropertyDescriptor.js';

// get original Component accessors to prevent infinite loops in tracer
// callbacks
export const origObjectGetter = getGetterPropertyDescriptor(Component.prototype, 'object');
export const origTypeGetter = getGetterPropertyDescriptor(Component.prototype, 'type');

// get original Object3D accessors/methods to prevent infinite loops in tracer
// callbacks
export const origNameGetter = getGetterPropertyDescriptor(Object3D.prototype, 'name');
export const origParentGetter = getGetterPropertyDescriptor(Object3D.prototype, 'parent');
export const origChildrenGetter = getGetterPropertyDescriptor(Object3D.prototype, 'children');
export const origGetComponentsMethod = getValuePropertyDescriptor(Object3D.prototype, 'getComponents');
