import type {RemoteElementPropertyDefinition} from '../types.ts';
import type {RemoteElement} from '../RemoteElement.ts';
import {updateRemoteElementProperty} from '../internals.ts';

export function remoteProperty<Value = unknown>(
  definition?: RemoteElementPropertyDefinition<Value>,
) {
  return <ElementType extends RemoteElement>(
    target: ClassAccessorDecoratorTarget<ElementType, Value>,
    context: ClassAccessorDecoratorContext<ElementType, Value>,
  ): ClassAccessorDecoratorResult<ElementType, Value> => {
    const property = context.name as string;

    context.addInitializer(function defineProperty() {
      (this.constructor as typeof RemoteElement).createProperty(
        property,
        definition,
      );
    });

    return {
      set(value) {
        target.set.call(this, value);
        updateRemoteElementProperty(this, property, value);
      },
      init(value) {
        updateRemoteElementProperty(this, property, value);
        return value;
      },
    };
  };
}
