import type {ComponentChildren, ComponentType} from './types';
import {enqueueRender, Component} from './component';

let i = 0;

interface ConsumerProps<T> {
  children(value: T): ComponentChildren;
}

interface ProviderProps<T> {
  value: T;
  children?: ComponentChildren;
}

export interface Context<T> {
  Consumer: ComponentType<ConsumerProps<T>>;
  Provider: ComponentType<ProviderProps<T>>;
}

export function createContext<T>(defaultValue: T): Context<T> {
  const contextId = `__cC${i++}`;

  class Provider extends Component<ProviderProps<T>> {
    private subs: Component<any>[] = [];
    private context = {[contextId]: this};

    getChildContext() {
      return this.context;
    }

    shouldComponentUpdate(newProps: ProviderProps<T>) {
      if (this.props.value !== newProps.value) {
        this.subs.forEach(enqueueRender);
      }
    }

    sub(component: Component<any>) {
      const {subs} = this;
      subs.push(component);

      const oldComponentWillUnmount = component.componentWillUnmount;

      component.componentWillUnmount = () => {
        subs.splice(subs.indexOf(component), 1);
        oldComponentWillUnmount?.call(component);
      };
    }

    render({children}: ProviderProps<T>) {
      return children;
    }
  }

  function Consumer(props: ConsumerProps<T>, contextValue: T) {
    // return props.children(
    // 	context[contextId] ? context[contextId].props.value : defaultValue
    // );
    return props.children(contextValue);
  }

  const context = {
    _id: contextId,
    _defaultValue: defaultValue,
    Provider,
    Consumer,
  };

  // This subscribes every consumer to the context
  Consumer.contextType = context;

  return context;
}
