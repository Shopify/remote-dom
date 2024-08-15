// Copied from https://github.com/Shopify/remote-dom/blob/remote-ui/packages/core/src/types.ts

export const LEGACY_ACTION_MOUNT = 0;
export const LEGACY_ACTION_INSERT_CHILD = 1;
export const LEGACY_ACTION_REMOVE_CHILD = 2;
export const LEGACY_ACTION_UPDATE_TEXT = 3;
export const LEGACY_ACTION_UPDATE_PROPS = 4;

export const LEGACY_KIND_ROOT = 0;
export const LEGACY_KIND_COMPONENT = 1;
export const LEGACY_KIND_TEXT = 2;
export const LEGACY_KIND_FRAGMENT = 3;

export type LegacyId = string;

export interface LegacyActionArgumentMap {
  [LEGACY_ACTION_MOUNT]: [
    (LegacyRemoteTextSerialization | LegacyRemoteComponentSerialization)[],
  ];
  [LEGACY_ACTION_INSERT_CHILD]: [
    LegacyId | undefined,
    number,
    LegacyRemoteTextSerialization | LegacyRemoteComponentSerialization,
    LegacyId | undefined | false,
  ];
  [LEGACY_ACTION_REMOVE_CHILD]: [LegacyId | undefined, number];
  [LEGACY_ACTION_UPDATE_TEXT]: [LegacyId, string];
  [LEGACY_ACTION_UPDATE_PROPS]: [LegacyId, Record<string, unknown>];
}

export interface LegacyRemoteChannel {
  <T extends keyof LegacyActionArgumentMap>(
    type: T,
    ...payload: LegacyActionArgumentMap[T]
  ): void | Promise<void>;
}

export interface LegacyRemoteComponentSerialization<
  Type extends string = string,
> {
  id: LegacyId;
  type: Type;
  kind: typeof LEGACY_KIND_COMPONENT;
  props: Record<string, any>;
  children: (
    | LegacyRemoteComponentSerialization
    | LegacyRemoteTextSerialization
  )[];
}

export interface LegacyRemoteTextSerialization {
  id: LegacyId;
  text: string;
  kind: typeof LEGACY_KIND_TEXT;
}

export interface LegacyRemoteFragmentSerialization {
  id: LegacyId;
  kind: typeof LEGACY_KIND_FRAGMENT;
  children: (
    | LegacyRemoteComponentSerialization
    | LegacyRemoteTextSerialization
  )[];
}

// export interface RemoteRoot<
//   AllowedComponents extends RemoteComponentType<
//     string,
//     any
//   > = RemoteComponentType<any, any>,
//   AllowedChildrenTypes extends
//     | RemoteComponentType<string, any>
//     | boolean = true,
// > {
//   readonly kind: typeof LEGACY_KIND_ROOT;
//   readonly children: ReadonlyArray<
//     AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     >
//   >;
//   readonly options: RemoteRootOptions<AllowedComponents>;
//   append(
//     ...children: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//       true
//     >[]
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteRoot.append` instead.
//    */
//   appendChild(
//     child: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//       true
//     >,
//   ): void | Promise<void>;
//   removeChild(
//     child: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     >,
//   ): void | Promise<void>;
//   replaceChildren(
//     ...children: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//       true
//     >[]
//   ): void | Promise<void>;
//   insertBefore(
//     child: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     >,
//     before?: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     > | null,
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteRoot.insertBefore` instead.
//    */
//   insertChildBefore(
//     child: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     >,
//     before: AllowedChildren<
//       AllowedChildrenTypes,
//       RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//     >,
//   ): void | Promise<void>;
//   createComponent<Type extends AllowedComponents>(
//     type: Type,
//     ...rest: IfAllOptionalKeys<
//       PropsForRemoteComponent<Type>,
//       | [
//           (PropsForRemoteComponent<Type> | null)?,
//           ...AllowedChildren<
//             AllowedChildrenTypes,
//             RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//             true
//           >[],
//         ]
//       | [
//           (PropsForRemoteComponent<Type> | null)?,
//           AllowedChildren<
//             AllowedChildrenTypes,
//             RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//             true
//           >[]?,
//         ],
//       | [
//           PropsForRemoteComponent<Type>,
//           ...AllowedChildren<
//             AllowedChildrenTypes,
//             RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//             true
//           >[],
//         ]
//       | [
//           PropsForRemoteComponent<Type>,
//           AllowedChildren<
//             AllowedChildrenTypes,
//             RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
//             true
//           >[]?,
//         ]
//     >
//   ): RemoteComponent<Type, RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
//   createText(
//     text?: string,
//   ): RemoteText<RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
//   createFragment(): RemoteFragment<
//     RemoteRoot<AllowedComponents, AllowedChildrenTypes>
//   >;
//   mount(): Promise<void>;
// }

// export interface RemoteComponent<
//   Type extends RemoteComponentType<string, any>,
//   Root extends RemoteRoot<any, any>,
// > {
//   readonly kind: typeof LEGACY_KIND_COMPONENT;
//   readonly id: string;
//   readonly type: IdentifierForRemoteComponent<Type>;
//   readonly props: PropsForRemoteComponent<Type>;
//   readonly remoteProps: PropsForRemoteComponent<Type>;
//   readonly children: ReadonlyArray<
//     AllowedChildren<ExtractChildren<Type>, Root>
//   >;
//   readonly root: Root;
//   readonly top: RemoteComponent<any, Root> | Root | null;
//   readonly parent: RemoteComponent<any, Root> | Root | null;
//   remove(): void | Promise<void>;
//   updateProps(
//     props: Partial<PropsForRemoteComponent<Type>>,
//   ): void | Promise<void>;
//   append(
//     ...children: AllowedChildren<ExtractChildren<Type>, Root, true>[]
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteComponent.append` instead.
//    */
//   appendChild(
//     child: AllowedChildren<ExtractChildren<Type>, Root, true>,
//   ): void | Promise<void>;
//   removeChild(
//     child: AllowedChildren<ExtractChildren<Type>, Root>,
//   ): void | Promise<void>;
//   replaceChildren(
//     ...children: AllowedChildren<ExtractChildren<Type>, Root, true>[]
//   ): void | Promise<void>;
//   insertBefore(
//     child: AllowedChildren<ExtractChildren<Type>, Root>,
//     before?: AllowedChildren<ExtractChildren<Type>, Root> | null,
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteComponent.insertBefore` instead.
//    */
//   insertChildBefore(
//     child: AllowedChildren<ExtractChildren<Type>, Root>,
//     before: AllowedChildren<ExtractChildren<Type>, Root>,
//   ): void | Promise<void>;
// }

// export interface RemoteFragment<
//   Root extends RemoteRoot<any, any> = RemoteRoot<any, any>,
// > {
//   readonly kind: typeof LEGACY_KIND_FRAGMENT;
//   readonly id: string;
//   readonly children: ReadonlyArray<AllowedChildren<ExtractChildren<any>, Root>>;
//   readonly root: Root;
//   readonly top: RemoteComponent<any, Root> | Root | null;
//   readonly parent: RemoteComponent<any, Root> | Root | null;
//   append(
//     ...children: AllowedChildren<ExtractChildren<any>, Root, true>[]
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteComponent.append` instead.
//    */
//   appendChild(
//     child: AllowedChildren<ExtractChildren<any>, Root, true>,
//   ): void | Promise<void>;
//   removeChild(
//     child: AllowedChildren<ExtractChildren<any>, Root>,
//   ): void | Promise<void>;
//   replaceChildren(
//     ...children: AllowedChildren<ExtractChildren<any>, Root, true>[]
//   ): void | Promise<void>;
//   insertBefore(
//     child: AllowedChildren<ExtractChildren<any>, Root>,
//     before?: AllowedChildren<ExtractChildren<any>, Root> | null,
//   ): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteComponent.insertBefore` instead.
//    */
//   insertChildBefore(
//     child: AllowedChildren<ExtractChildren<any>, Root>,
//     before: AllowedChildren<ExtractChildren<any>, Root>,
//   ): void | Promise<void>;
// }

// export interface RemoteText<Root extends RemoteRoot<any, any>> {
//   readonly kind: typeof LEGACY_KIND_TEXT;
//   readonly id: string;
//   readonly text: string;
//   readonly root: Root;
//   readonly top: RemoteComponent<any, Root> | Root | null;
//   readonly parent: RemoteComponent<any, Root> | Root | null;
//   update(text: string): void | Promise<void>;
//   /**
//    * @deprecated use `RemoteText.update` instead.
//    */
//   updateText(text: string): void | Promise<void>;
//   remove(): void | Promise<void>;
// }

// export type RemoteChild<Root extends RemoteRoot<any, any>> =
//   | RemoteComponent<any, Root>
//   | RemoteText<Root>;
