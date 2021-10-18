import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';

import {closest} from '../closest';

const Target = createRemoteComponent<'Target', {disabled?: boolean}>('Target');
const Descendant = createRemoteComponent('Descendant');

describe('closest()', () => {
  it('returns the component if it matches', () => {
    const root = createRemoteRoot(() => {});
    const target = root.createComponent(Target);
    expect(closest(target, Target)).toBe(target);
  });

  it('returns null when no ancestor matches', () => {
    const root = createRemoteRoot(() => {});
    const descendant = root.createComponent(Descendant);
    root.appendChild(descendant);
    expect(closest(descendant, Target)).toBeNull();
  });

  it('returns the nearest matching ancestor', () => {
    const root = createRemoteRoot(() => {});
    const descendant = root.createComponent(Descendant);
    const target = root.createComponent(Target);
    const outerTarget = root.createComponent(Target);

    target.appendChild(descendant);
    outerTarget.appendChild(target);
    root.appendChild(outerTarget);

    expect(closest(descendant, Target)).toBe(target);
  });

  it('returns the first matching ancestor with matching props when they are passed', () => {
    const root = createRemoteRoot(() => {});
    const descendant = root.createComponent(Descendant);
    const target = root.createComponent(Target, {disabled: true});
    const innerTarget = root.createComponent(Target, {disabled: false});

    innerTarget.appendChild(descendant);
    target.appendChild(innerTarget);
    root.appendChild(target);

    expect(closest(descendant, Target, {disabled: true})).toBe(target);
  });
});
