<script lang="ts">
  import {RemoteEvent} from '@remote-dom/core/elements';
  import type {RenderApi} from '../../types.ts';

  export let api: RenderApi;

  let value = '';

  function handleChange(event: RemoteEvent<string>) {
    value = event.detail;
  }

  async function handlePress() {
    await api.alert(
      `Current value in remote sandbox: ${JSON.stringify(value)}`,
    );
  }
</script>

<ui-stack spacing>
  <ui-text-field
    label="Message for remote environment (rendered using svelte)"
    on:change={handleChange}
  />
  <ui-button on:press={handlePress}> Show alert </ui-button>
</ui-stack>
