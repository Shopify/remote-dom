export interface PropertyApplyOptions {
  type: string;
  element: HTMLElement;
  property: string;
  value: unknown;
}

export type PropertyApply = (options: PropertyApplyOptions) => boolean | void;
