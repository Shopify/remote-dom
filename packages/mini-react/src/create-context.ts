import type {ComponentChildren, Component} from './types';
import {enqueueRender} from './component';

export let i = 0;

type Provider<T> = {
  (
    props: {value: T; children?: ComponentChildren},
    subs?: any[],
    context?: any,
  ): ComponentChildren;
  sub(component: Component): void;
} & Pick<Component<{value: T}>, 'getChildContext' | 'shouldComponentUpdate'>;

export interface ContextType<T> {
  _id: string;
  _defaultValue: T;
  Consumer(
    props: {children(value: T): ComponentChildren},
    value?: T,
  ): ComponentChildren;
  Provider: Provider<T>;
}

export function createContext<T>(defaultValue: T): ContextType<T> {
  const contextId = `__cC${i++}`;

  const context: ContextType<T> = {
    _id: contextId,
    _defaultValue: defaultValue,
    Consumer(props, contextValue) {
      return props.children(contextValue!);
    },
    Provider(this: Provider<T>, props) {
      if (!this.getChildContext) {
        const subs: Component<any>[] = [];
        const context = {[contextId]: this};

        this.getChildContext = () => context;

        this.shouldComponentUpdate = function (_props: {value: T}) {
          if (this.props.value !== _props.value) {
            // I think the forced value propagation here was only needed when `options.debounceRendering` was being bypassed:
            // https://github.com/preactjs/preact/commit/4d339fb803bea09e9f198abf38ca1bf8ea4b7771#diff-54682ce380935a717e41b8bfc54737f6R358
            // In those cases though, even with the value corrected, we're double-rendering all nodes.
            // It might be better to just tell folks not to use force-sync mode.
            // Currently, using `useContext()` in a class component will overwrite its `this.context` value.
            // subs.some(c => {
            // 	c.context = _props.value;
            // 	enqueueRender(c);
            // });

            // subs.some(c => {
            // 	c.context[contextId] = _props.value;
            // 	enqueueRender(c);
            // });
            subs.some(enqueueRender);
          }
        };

        this.sub = (c: Component) => {
          subs.push(c);
          const old = c.componentWillUnmount;
          c.componentWillUnmount = () => {
            subs.splice(subs.indexOf(c), 1);
            old?.call(c);
          };
        };
      }

      return props.children;
    },
  };

  // Devtools needs access to the context object when it
  // encounters a Provider. This is necessary to support
  // setting `displayName` on the context object instead
  // of on the component itself. See:
  // https://reactjs.org/docs/context.html#contextdisplayname

  context.Provider._contextRef = context;
  context.Consumer.contextType = context;

  return context;
}
