import {ref, shallowRef, watch, onMounted, onUnmounted} from 'vue';
import type {RemoteReceiver} from '@remote-ui/core';

type Attachable = Parameters<RemoteReceiver['listen']>[0];

export function useAttached<T extends Attachable>(
  receiver: RemoteReceiver,
  attachable: T,
) {
  const attachableRef = shallowRef(attachable);
  const receiverRef = shallowRef(receiver);

  const attached = shallowRef<T | null>({...attachable});

  const updateAttached = () => {
    const newAttached = receiverRef.value.get(attachableRef.value) as T | null;

    if (!shallowEqual(newAttached, attached.value as any)) {
      attached.value = newAttached && ({...newAttached} as any);
    }
  };

  const stopListeningRef = ref<(() => void) | null>(null);

  const updateListener = () => {
    stopListeningRef.value?.();
    stopListeningRef.value = receiverRef.value.listen(
      attachableRef.value,
      updateAttached,
    );
  };

  onMounted(() => {
    updateListener();
    updateAttached();
  });

  watch([receiverRef, attachableRef], () => {
    updateListener();
    updateAttached();
  });

  onUnmounted(() => {
    stopListeningRef.value?.();
  });

  return attached;
}

function shallowEqual<T>(one: T, two: T) {
  if (one == null) return two == null;
  if (two == null) return false;

  return Object.keys(two).every(
    (key) => (one as any)[key] === (two as any)[key],
  );
}
