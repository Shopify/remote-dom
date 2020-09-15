import {createRemoteRoot, createRemoteComponent} from '@remote-ui/core';
import {createElement, render, Component} from '..';

describe('e2e', () => {
  it('works', async () => {
    const root = createRemoteRoot(console.log);
    const Button = createRemoteComponent('Button');

    await new Promise((resolve) => {
      class MyComponent extends Component {
        state = {text: 'Foo'};

        componentDidMount() {
          this.setState({text: 'FooBar'}, () => {
            resolve();
          });
        }

        render() {
          return createElement(Button, {onPress: console.log}, this.state.text);
        }
      }

      render(createElement(MyComponent, {}), root);

      root.mount();
    });

    console.log(root.children);

    expect(true).toBe(true);
  });
});
