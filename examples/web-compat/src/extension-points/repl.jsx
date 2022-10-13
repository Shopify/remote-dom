import {extend, document} from '../client';

/** @jsx h */

function h(type, props, ...children) {
  let el = document.createElement(type);
  for (let prop in props) {
    const value = props[prop];
    if (prop.includes('-')) el.setAttribute(prop, value);
    else el[prop] = value;
  }
  el.append(...children.flat());
  return el;
}

const EXAMPLES = {};

EXAMPLES['Counter'] = `\
const text = new Text(0);
const btn = document.createElement('button');
btn.onclick = () => {
  text.data = (text.data | 0) + 1;
};
btn.textContent = 'Increment';
root.append(text, btn);
`;

EXAMPLES['Clock'] = `\
function tick() {
  let time = new Date().toLocaleTimeString();
  root.textContent = time;
}
tick();
setInterval(tick, 1000);
`;

/** A simple REPL */
extend('repl', (root, api) => {
  function loadExample(name) {
    example = name;
    code.value = EXAMPLES[example];
    const prev = base.querySelector(`[highlight]`);
    console.log({prev});
    if (prev) prev.removeAttribute('highlight');
    // base.querySelector(`[data-example="${example}"]`).highlight = true;
    base
      .querySelector(`[data-example="${example}"]`)
      .setAttribute('highlight', '');
    console.log(
      base.querySelectorAll('[data-example]').map((node) => node.outerHTML),
    );
  }
  let example = Object.keys(EXAMPLES)[0];
  const code = (
    <ui-text-field multiline value={EXAMPLES[example]} oninput={handleInput} />
  );
  const output = <ui-view />;
  const base = (
    <ui-view borderWidth={5}>
      <ui-block-stack>
        {code}
        <ui-inline-stack>
          <button onPress={run}>Run</button>
          <button onPress={reset}>Reset</button>
        </ui-inline-stack>
        <ui-text size="small">Examples: </ui-text>
        <ui-view overflow="auto">
          <ui-inline-stack>
            {Object.keys(EXAMPLES).map((example) => (
              <button
                data-example={example}
                onPress={loadExample.bind(null, example)}
              >
                {example}
              </button>
            ))}
          </ui-inline-stack>
        </ui-view>
        {output}
      </ui-block-stack>
    </ui-view>
  );
  root.append(base);

  function handleInput(e) {
    code.value = e.currentTarget.value;
  }

  let cleanup = [];
  const _setTimeout = (...args) => {
    const id = setTimeout(...args);
    cleanup.push(clearTimeout.bind(null, id));
    return id;
  };
  const _setInterval = (...args) => {
    const id = setInterval(...args);
    cleanup.push(clearInterval.bind(null, id));
    return id;
  };

  console.log({root, output, code});

  function run() {
    reset();
    try {
      new Function('root', 'setTimeout', 'setInterval', code.value)(
        output,
        _setTimeout,
        _setInterval,
      );
    } catch (err) {
      output.append(
        <ui-view overflow="auto">
          <ui-text-block monospace color="red" overflow="auto">
            {err.stack || String(err)}
          </ui-text-block>
        </ui-view>,
      );
    }
  }

  function reset() {
    cleanup.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    cleanup.length = 0;
    output.replaceChildren();
  }
});
