import type {RemoteElementSlotsDefinition} from '../types.ts';
import type {RemoteElementConstructor} from '../RemoteElement.ts';

export function remoteSlots<Slots extends Record<string, any> = {}>(
  slots: RemoteElementSlotsDefinition<Slots>,
) {
  return <ElementConstructor extends RemoteElementConstructor<Slots, any>>(
    _: ElementConstructor,
    context: ClassDecoratorContext<ElementConstructor>,
  ) => {
    context.addInitializer(function defineElement() {
      (this as any).remoteSlots = {...this.remoteSlots, ...slots};
    });
  };
}
