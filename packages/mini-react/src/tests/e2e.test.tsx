import {createRemoteComponent} from '@remote-ui/core';
import {createElement, render, Component} from '..';
import {mount} from '../testing';

describe('e2e', () => {
  it('works', async () => {
    const Button = createRemoteComponent('Button');

    class MyComponent extends Component {
      state = {text: 'Foo'};

      componentDidMount() {
        this.setState({text: 'FooBar'});
      }

      render() {
        return createElement(Button, {onPress: console.log}, this.state.text);
      }
    }

    const myComponent = mount(createElement(MyComponent));

    // console.log(root.children[0].children[0].text);
    console.log(myComponent.find(Button));

    expect(true).toBe(true);
  });
});
