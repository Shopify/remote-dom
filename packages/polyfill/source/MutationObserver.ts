import type {Node} from './Node.ts';
import {NodeList} from './NodeList.ts';

export interface MutationObserverInit {
  attributes?: boolean;
  attributeFilter?: string[];
  attributeOldValue?: boolean;
  characterData?: boolean;
  characterDataOldValue?: boolean;
  childList?: boolean;
  subtree?: boolean;
}

export interface MutationRecord {
  readonly addedNodes: NodeList;
  readonly attributeName: string | null;
  readonly attributeNamespace: string | null;
  readonly nextSibling: Node | null;
  readonly oldValue: string | null;
  readonly previousSibling: Node | null;
  readonly removedNodes: NodeList;
  readonly target: Node;
  readonly type: 'attributes' | 'characterData' | 'childList';
}

export type MutationCallback = (
  mutations: MutationRecord[],
  observer: MutationObserver,
) => void;

interface NormalizedMutationObserverInit {
  attributes: boolean;
  attributeFilter?: Set<string>;
  attributeOldValue: boolean;
  characterData: boolean;
  characterDataOldValue: boolean;
  childList: boolean;
  subtree: boolean;
}

type MutationRecordInit = Pick<MutationRecord, 'target' | 'type'> &
  Partial<
    Pick<
      MutationRecord,
      | 'addedNodes'
      | 'attributeName'
      | 'attributeNamespace'
      | 'nextSibling'
      | 'oldValue'
      | 'previousSibling'
      | 'removedNodes'
    >
  >;

type Registrations = WeakMap<
  Node,
  Map<MutationObserver, NormalizedMutationObserverInit>
>;

let registrations: Registrations | undefined;
let registrationCount = 0;
let attributeRegistrationCount = 0;
let characterDataRegistrationCount = 0;
let childListRegistrationCount = 0;

// Mutation sites read these live bindings before capturing old values or
// allocating record data. Keep them split so observing one mutation type does
// not add work to unrelated mutations.
/** @internal */
export let attributeObserversActive = false;
/** @internal */
export let characterDataObserversActive = false;
/** @internal */
export let childListObserversActive = false;

export class MutationObserver {
  readonly #callback: MutationCallback;
  readonly #records: MutationRecord[] = [];
  readonly #targets = new Set<Node>();
  #scheduled = false;

  constructor(callback: MutationCallback) {
    if (typeof callback !== 'function') {
      throw new TypeError('MutationObserver callback must be a function');
    }

    this.#callback = callback;
  }

  observe(target: Node, options: MutationObserverInit = {}) {
    const normalizedOptions = normalizeOptions(options);
    const currentRegistrations = (registrations ??= new WeakMap());
    let targetRegistrations = currentRegistrations.get(target);

    if (targetRegistrations == null) {
      targetRegistrations = new Map();
      currentRegistrations.set(target, targetRegistrations);
    }

    const previousOptions = targetRegistrations.get(this);
    if (previousOptions == null) {
      registrationCount++;
    } else {
      updateRegistrationCounts(previousOptions, -1);
    }

    targetRegistrations.set(this, normalizedOptions);
    updateRegistrationCounts(normalizedOptions, 1);
    this.#targets.add(target);
  }

  disconnect() {
    const currentRegistrations = registrations;
    if (currentRegistrations == null) return;

    for (const target of this.#targets) {
      const targetRegistrations = currentRegistrations.get(target);
      const options = targetRegistrations?.get(this);
      if (options != null) {
        targetRegistrations!.delete(this);
        registrationCount--;
        updateRegistrationCounts(options, -1);
      }

      if (targetRegistrations?.size === 0) {
        currentRegistrations.delete(target);
      }
    }

    this.#targets.clear();
    this.#records.length = 0;

    if (registrationCount === 0) {
      registrations = undefined;
    }
  }

  takeRecords() {
    return this.#records.splice(0);
  }

  /** @internal */
  enqueue(record: MutationRecord) {
    this.#records.push(record);

    if (this.#scheduled) return;
    this.#scheduled = true;

    queueMicrotask(() => {
      this.#scheduled = false;
      const records = this.takeRecords();

      if (records.length > 0) {
        this.#callback.call(this, records, this);
      }
    });
  }
}

/** @internal */
export function queueMutationRecord(init: MutationRecordInit) {
  const currentRegistrations = registrations;
  if (currentRegistrations == null) return;

  const interestedObservers = new Map<MutationObserver, boolean>();
  let node: Node | null = init.target;

  while (node) {
    const targetRegistrations = currentRegistrations.get(node);

    if (targetRegistrations) {
      for (const [observer, options] of targetRegistrations) {
        if (node !== init.target && !options.subtree) continue;

        let includeOldValue = false;

        if (init.type === 'attributes') {
          if (!options.attributes) continue;
          if (
            options.attributeFilter &&
            !options.attributeFilter.has(init.attributeName ?? '')
          ) {
            continue;
          }
          includeOldValue = options.attributeOldValue;
        } else if (init.type === 'characterData') {
          if (!options.characterData) continue;
          includeOldValue = options.characterDataOldValue;
        } else if (!options.childList) {
          continue;
        }

        interestedObservers.set(
          observer,
          interestedObservers.get(observer) === true || includeOldValue,
        );
      }
    }

    node = node.parentNode;
  }

  for (const [observer, includeOldValue] of interestedObservers) {
    observer.enqueue({
      addedNodes: init.addedNodes ?? new NodeList(),
      attributeName: init.attributeName ?? null,
      attributeNamespace: init.attributeNamespace ?? null,
      nextSibling: init.nextSibling ?? null,
      oldValue: includeOldValue ? (init.oldValue ?? null) : null,
      previousSibling: init.previousSibling ?? null,
      removedNodes: init.removedNodes ?? new NodeList(),
      target: init.target,
      type: init.type,
    });
  }
}

/** @internal */
export function mutationNodeList(...nodes: Node[]) {
  const list = new NodeList();
  list.push(...nodes);
  return list;
}

function normalizeOptions(
  options: MutationObserverInit,
): NormalizedMutationObserverInit {
  if (
    options.attributes === false &&
    (options.attributeOldValue || options.attributeFilter != null)
  ) {
    throw new TypeError(
      'attributeOldValue and attributeFilter require attributes to be enabled',
    );
  }

  if (options.characterData === false && options.characterDataOldValue) {
    throw new TypeError(
      'characterDataOldValue requires characterData to be enabled',
    );
  }

  const attributes =
    options.attributes ??
    (options.attributeOldValue === true || options.attributeFilter != null);
  const characterData =
    options.characterData ?? options.characterDataOldValue === true;
  const childList = options.childList === true;

  if (!attributes && !characterData && !childList) {
    throw new TypeError(
      'MutationObserver options must enable childList, attributes, or characterData',
    );
  }

  return {
    attributes,
    attributeFilter:
      options.attributeFilter == null
        ? undefined
        : new Set(options.attributeFilter.map(String)),
    attributeOldValue: options.attributeOldValue === true,
    characterData,
    characterDataOldValue: options.characterDataOldValue === true,
    childList,
    subtree: options.subtree === true,
  };
}

function updateRegistrationCounts(
  options: NormalizedMutationObserverInit,
  delta: 1 | -1,
) {
  if (options.attributes) attributeRegistrationCount += delta;
  if (options.characterData) characterDataRegistrationCount += delta;
  if (options.childList) childListRegistrationCount += delta;

  attributeObserversActive = attributeRegistrationCount > 0;
  characterDataObserversActive = characterDataRegistrationCount > 0;
  childListObserversActive = childListRegistrationCount > 0;
}
