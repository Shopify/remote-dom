import type {ComponentType} from 'react';
import type {Controller, Renderer} from './types';

import {renderComponent} from './RemoteComponent';
import {renderText} from './RemoteText';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

export function createController(
  components: ComponentMapping,
  renderer: Partial<Renderer> = {},
): Controller {
  const registry = new Map(Object.entries(components));

  return {
    get(type) {
      const value = registry.get(type as any);
      if (value == null) {
        throw new Error(`Unknown component: ${type}`);
      }
      return value;
    },
    renderer: {
      renderComponent,
      renderText,
      ...renderer,
    },
  };
}
