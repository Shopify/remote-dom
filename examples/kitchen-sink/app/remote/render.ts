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
    case 'svelte': {
      const {renderUsingSvelte} = await import('./examples/svelte.ts');
      return renderUsingSvelte(root, api);
    }
    case 'vue': {
      const {renderUsingVue} = await import('./examples/vue.ts');
      return renderUsingVue(root, api);
    }
    case 'game': {
      const {renderGame} = await import('./examples/game.tsx');
      return renderGame(root, api);
    }
  }
}
