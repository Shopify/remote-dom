import type {RemoteElementPropertiesDefinition} from '../types.ts';
import type {RemoteElementConstructor} from '../RemoteElement.ts';

export function remoteProperties<Properties extends Record<string, any> = {}>(
  properties: RemoteElementPropertiesDefinition<Properties>,
) {
  return <ElementConstructor extends RemoteElementConstructor<Properties, any>>(
    Class: ElementConstructor,
    _context: ClassDecoratorContext<ElementConstructor>,
  ): ElementConstructor => {
    return class extends (Class as any) {
      static remoteProperties = properties;
    } as any;
  };
}
