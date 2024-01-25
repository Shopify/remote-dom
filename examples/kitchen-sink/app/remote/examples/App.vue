<script lang="ts" setup>
import type {RemoteEvent} from '@remote-dom/core/elements';

import type {RenderAPI} from '../../types.ts';

const {api} = defineProps<{api: RenderAPI}>();

let value = '';

function handleChange(event: RemoteEvent<string>) {
  value = event.detail;
}

async function handlePress() {
  await api.alert(`Current value in remote sandbox: ${JSON.stringify(value)}`);
}
</script>

<template>
  <ui-stack spacing>
    <ui-text-field
      label="Message for remote environment (rendered using vue)"
      @change="handleChange"
    />
    <ui-button @press="handlePress"> Show alert </ui-button>
  </ui-stack>
</template>
