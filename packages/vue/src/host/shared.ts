import {ref, shallowRef, watch, onMounted, onUnmounted} from 'vue';
import type {RemoteReceiver, RemoteReceiverAttachable} from '@remote-ui/core';

export function useAttached<T extends RemoteReceiverAttachable>(
  receiver: RemoteReceiver,
  attachable: T,
) {
  const attachableRef = shallowRef(attachable);
  const receiverRef = shallowRef(receiver);

  const attached = shallowRef<T | null>({...attachable});

  const updateAttached = () => {
    const newAttached = receiverRef.value.attached.get(
      attachableRef.value,
    ) as T | null;

    const {value: currentAttached} = attached;

    if (
      newAttached?.id !== currentAttached?.id ||
      newAttached?.version !== currentAttached?.version
    ) {
      attached.value = newAttached && {...newAttached};
    }
  };

  const stopListeningRef = ref<(() => void) | null>(null);

  const updateListener = () => {
    stopListeningRef.value?.();
    stopListeningRef.value = receiverRef.value.attached.subscribe(
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
