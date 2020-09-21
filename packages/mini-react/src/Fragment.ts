import type {RenderableProps} from './types';

export function Fragment(props: RenderableProps<{}>) {
  return props.children;
}
