import type {ComponentType, ReactNode} from 'react';
import type {
  Controller,
  RemoteComponentProps,
  RemoteTextProps,
  RenderComponentOptions,
  Renderer,
  RenderTextOptions,
} from './types';

import {renderComponent as defaultRenderComponent} from './RemoteComponent';
import {renderText as defaultRenderText} from './RemoteText';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

interface RendererFactory {
  renderComponent(
    props: RemoteComponentProps,
    options: RenderComponentOptions,
  ): ReactNode;
  renderText(props: RemoteTextProps, options: RenderTextOptions): ReactNode;
}

export function createController(
  components: ComponentMapping,
  {
    renderComponent: externalRenderComponent,
    renderText: externalRenderText,
  }: Partial<RendererFactory> = {},
): Controller {
  const registry = new Map(Object.entries(components));
  const renderComponent: Renderer['renderComponent'] = externalRenderComponent
    ? (componentProps) =>
        externalRenderComponent(componentProps, {
          renderDefault() {
            return defaultRenderComponent(componentProps);
          },
        })
    : defaultRenderComponent;
  const renderText: Renderer['renderText'] = externalRenderText
    ? (textProps) =>
        externalRenderText(textProps, {
          renderDefault() {
            return defaultRenderText(textProps);
          },
        })
    : defaultRenderText;

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
    },
  };
}
