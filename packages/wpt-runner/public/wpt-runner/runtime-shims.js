const __WPT_SVG_NAMESPACE__ = 'http://www.w3.org/2000/svg';
const __wptLocation = new URL(__WPT_CONTEXT__.href, 'https://wpt.local/');

for (const target of new Set([
  globalThis,
  globalThis.window,
  globalThis.self,
])) {
  if (!target) continue;
  Object.defineProperty(target, 'location', {
    configurable: true,
    value: __wptLocation,
  });
}

if (
  globalThis.location.pathname !== __WPT_CONTEXT__.pathname ||
  globalThis.location.search !== __WPT_CONTEXT__.search
) {
  throw new Error('The worker could not install the selected WPT location.');
}

function __appendWptNode(parent, spec) {
  if (spec.kind === 'text') {
    const text = document.createTextNode(spec.text ?? '');
    parent.appendChild(text);
    return text;
  }

  const element =
    spec.namespace === 'svg'
      ? document.createElementNS(__WPT_SVG_NAMESPACE__, spec.name)
      : document.createElement(spec.name);

  for (const [name, value] of spec.attributes)
    element.setAttribute(name, value);
  parent.appendChild(element);
  for (const child of spec.children) __appendWptNode(element, child);
  return element;
}
