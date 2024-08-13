import type {RenderAPI} from '../../types.ts';

export function renderUsingVanillaDOM(root: Element, api: RenderAPI) {
  let count = 0;

  function handleClose() {
    if (count > 0) {
      api.alert(`You clicked ${count} times!`);
    }

    updateCount(0);
  }

  function updateCount(newCount: number) {
    count = newCount;
    countText.textContent = String(count);
  }

  const countText = document.createElement('ui-text');
  countText.textContent = String(count);
  countText.setAttribute('emphasis', '');

  const template = document.createElement('div');

  template.innerHTML = `
    <ui-modal slot="modal">
      <ui-text>Click count: </ui-text>
      <ui-button id="increment">Click me!</ui-button>
      <ui-button id="close" slot="primaryAction">
        Close
      </ui-button>
    </ui-modal>
  `.trim();

  const modal = template.querySelector('ui-modal')!;

  modal.addEventListener('close', handleClose);

  modal.querySelector('ui-text')!.append(countText);

  root.addEventListener('press', (event) => {
    const id = (event.target as Element).getAttribute('id');
    // console.log(id, event);
    if (id === 'increment') updateCount(count + 1);
    if (id === 'close') modal.close();
  });

  template.innerHTML = `
    <ui-stack spacing>
      <ui-text>
        Rendering example: <ui-text emphasis></ui-text>
      </ui-text>
      <ui-text>
        Rendering in sandbox: <ui-text emphasis></ui-text>
      </ui-text>

      <ui-button>Open modal</ui-button>
    </ui-stack>
  `.trim();

  const stack = template.firstElementChild!;

  const [exampleText, sandboxText] = [
    ...stack.querySelectorAll('ui-text[emphasis]')!,
  ];
  exampleText!.textContent = api.example;
  sandboxText!.textContent = api.sandbox;

  stack.querySelector('ui-button')!.append(modal);

  root.append(stack);
}
