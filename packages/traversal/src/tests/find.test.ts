import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';

import {find, findAll} from '../find';

const Target = createRemoteComponent<'Target', {disabled?: boolean}>('Target');
const RedHerring = createRemoteComponent('RedHerring');

describe('find()', () => {
  it('finds a single element', () => {
    const root = createRemoteRoot(() => {});
    const target = root.createComponent(Target);
    root.appendChild(target);
    expect(find(root, Target)).toBe(target);
  });

  it('returns null when no matching element is found', () => {
    const root = createRemoteRoot(() => {});
    root.appendChild(root.createComponent(RedHerring));
    expect(find(root, Target)).toBeNull();
  });

  it('returns the first element when multiple are found', () => {
    const root = createRemoteRoot(() => {});
    const target = root.createComponent(Target);
    root.appendChild(target);
    root.appendChild(root.createComponent(Target));
    expect(find(root, Target)).toBe(target);
  });

  it('returns the first matching component with matching props when they are passed', () => {
    const root = createRemoteRoot(() => {});
    root.appendChild(root.createComponent(Target, {disabled: false}));

    const target = root.createComponent(Target, {disabled: true});
    root.appendChild(target);

    expect(find(root, Target, {disabled: true})).toBe(target);
  });
});

describe('findAll()', () => {
  it('finds all matching elements', () => {
    const root = createRemoteRoot(() => {});
    const targetOne = root.createComponent(Target);
    const targetTwo = root.createComponent(Target);
    const container = root.createComponent(RedHerring);

    container.appendChild(targetTwo);
    root.appendChild(targetOne);
    root.appendChild(container);

    expect(findAll(root, Target)).toStrictEqual([targetOne, targetTwo]);
  });

  it('finds all matching components with matching props when they are passed', () => {
    const root = createRemoteRoot(() => {});
    const targetOne = root.createComponent(Target, {disabled: true});
    const targetTwo = root.createComponent(Target, {disabled: false});
    const container = root.createComponent(RedHerring);

    container.appendChild(targetTwo);
    root.appendChild(targetOne);
    root.appendChild(container);

    expect(findAll(root, Target, {disabled: false})).toStrictEqual([targetTwo]);
  });
});
