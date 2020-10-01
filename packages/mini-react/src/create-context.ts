import type {
  ComponentInternal,
  Context,
  ContextConsumerProps,
  ContextInternal,
  ContextProviderProps,
} from './types';
import {enqueueRender, Component} from './Component';

let i = 0;

export function createContext<T>(defaultValue: T): Context<T> {
  const contextId = `__cC${i++}`;

  class Provider extends Component<ContextProviderProps<T>> {
    private subs: ComponentInternal<any>[] = [];
    private contextValue = {[contextId]: this};

    getChildContext() {
      return this.contextValue;
    }

    shouldComponentUpdate(newProps: ContextProviderProps<T>) {
      if (this.props.value !== newProps.value) {
        this.subs.forEach(enqueueRender);
      }

      return true;
    }

    sub(component: ComponentInternal<any>) {
      const {subs} = this;
      subs.push(component);

      const oldComponentWillUnmount = component.componentWillUnmount;

      component.componentWillUnmount = () => {
        subs.splice(subs.indexOf(component), 1);
        oldComponentWillUnmount?.call(component);
      };
    }

    render({children}: ContextProviderProps<T>) {
      return children;
    }
  }

  function Consumer(props: ContextConsumerProps<T>, contextValue: T) {
    // return props.children(
    // 	context[contextId] ? context[contextId].props.value : defaultValue
    // );
    return props.children(contextValue);
  }

  const context: ContextInternal<T> = {
    _id: contextId,
    _defaultValue: defaultValue,
    Provider,
    Consumer,
  };

  // This subscribes every consumer to the context
  Consumer.contextType = context;

  return context;
}
