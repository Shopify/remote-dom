<script lang="ts">
  import type {Modal} from '../elements.ts';
  import type {RenderAPI} from '../../types.ts';

  export let api: RenderAPI;

  let count = 0;
  let modal: InstanceType<typeof Modal>;

  function handlePress() {
    count += 1;
  }

  function handleClose() {
    count = 0;
  }

  function handlePrimaryAction() {
    modal.close();
  }
</script>

<ui-stack spacing>
  <ui-text>
    Rendering example: <ui-text emphasis>{api.example}</ui-text>
  </ui-text>
  <ui-text>
    Rendering in sandbox: <ui-text emphasis>{api.sandbox}</ui-text>
  </ui-text>

  <ui-button>
    Open modal

    <ui-modal slot="modal" bind:this={modal} on:close={handleClose}>
      <ui-text>Click count: <ui-text emphasis>{count}</ui-text></ui-text>
      <ui-button on:press={handlePress}>Click me!</ui-button>
      <ui-button slot="primaryAction" on:press={handlePrimaryAction}
        >Close</ui-button
      >
    </ui-modal>
  </ui-button>
</ui-stack>
