import { Component, Object3D } from '@wonderlandengine/api';
import { getGetterPropertyDescriptor } from '../inject/getGetterPropertyDescriptor.js';
import { getValuePropertyDescriptor } from '../inject/getValuePropertyDescriptor.js';

// get original Component accessors to prevent infinite loops in tracer
// callbacks
export const origObjectGetter = getGetterPropertyDescriptor(Component, 'object');
export const origTypeGetter = getGetterPropertyDescriptor(Component, 'type');

// get original Object3D accessors/methods to prevent infinite loops in tracer
// callbacks
export const origNameGetter = getGetterPropertyDescriptor(Object3D, 'name');
export const origParentGetter = getGetterPropertyDescriptor(Object3D, 'parent');
export const origChildrenGetter = getGetterPropertyDescriptor(Object3D, 'children');
export const origGetComponentsMethod = getValuePropertyDescriptor(Object3D, 'getComponents');
