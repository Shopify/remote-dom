import {RemoteChannel} from '@remote-ui/core';
import type {RenderAPI} from '../types.ts';

// Defines the custom elements available to render in the remote environment.
import './elements.ts';

export async function render(root: Element, api: RenderAPI) {
  switch (api.example) {
    case 'vanilla': {
      const {renderUsingVanillaDOM} = await import('./examples/vanilla.ts');
      return renderUsingVanillaDOM(root, api);
    }
    case 'htm': {
      const {renderUsingHTM} = await import('./examples/htm.ts');
      return renderUsingHTM(root, api);
    }
    case 'preact': {
      const {renderUsingPreact} = await import('./examples/preact.tsx');
      return renderUsingPreact(root, api);
    }
    case 'react': {
      const {renderUsingReact} = await import('./examples/react.tsx');
      return renderUsingReact(root, api);
    }
    case 'react-mutations-1':
    case 'react-mutations-2':
    case 'react-mutations-3': {
      const {renderUsingReact} = await import('./examples/react-mutations.tsx');
      return renderUsingReact(root, api);
    }
    case 'svelte': {
      const {renderUsingSvelte} = await import('./examples/svelte.ts');
      return renderUsingSvelte(root, api);
    }
    case 'vue': {
      const {renderUsingVue} = await import('./examples/vue.ts');
      return renderUsingVue(root, api);
    }
  }
}

export async function renderLegacy(channel: RemoteChannel, api: RenderAPI) {
  const {renderUsingReactRemoteUI} = await import(
    './examples/react-remote-ui.tsx'
  );
  return renderUsingReactRemoteUI(channel, api);
}
