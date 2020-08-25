import {createRemoteRoot} from '../root';

describe('root', () => {
  it('does not throw error when no allowed components are set', () => {
    const root = createRemoteRoot(() => {});

    expect(() => {
      const Card = root.createComponent('Card');
      root.appendChild(Card);

      const Button = root.createComponent('Button');
      root.appendChild(Button);
    }).not.toThrowError();

    expect(root.children).toHaveLength(2);
  });

  it('does not throw error for allowed components', () => {
    const components = ['Card', 'Button'];
    const root = createRemoteRoot(() => {}, {components});

    expect(() => {
      const Card = root.createComponent('Card');
      root.appendChild(Card);

      const Button = root.createComponent('Button');
      root.appendChild(Button);
    }).not.toThrowError();

    expect(root.children).toHaveLength(2);
  });

  it('throws error for not allowed components', () => {
    const components = ['Card'];
    const root = createRemoteRoot(() => {}, {components});

    expect(() => {
      const Card = root.createComponent('Card');
      root.appendChild(Card);

      const Button = root.createComponent('Button');
      root.appendChild(Button);
    }).toThrowError();

    expect(root.children).toHaveLength(1);
  });
});
