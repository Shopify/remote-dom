import type {ComponentType} from 'react';
import type {Controller, Renderer} from './types';

import {renderComponent as defaultRenderComponent} from './RemoteComponent';
import {renderText as defaultRenderText} from './RemoteText';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

interface RendererFactory {
  componentRenderer: (
    defaultRenderer: Renderer['renderComponent'],
  ) => Renderer['renderComponent'];
  textRenderer: (
    defaultRenderer: Renderer['renderText'],
  ) => Renderer['renderText'];
}

export function createController(
  components: ComponentMapping,
  {componentRenderer, textRenderer}: Partial<RendererFactory> = {},
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
      renderComponent:
        componentRenderer?.(defaultRenderComponent) ?? defaultRenderComponent,
      renderText: textRenderer?.(defaultRenderText) ?? defaultRenderText,
    },
  };
}
