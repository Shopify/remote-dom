<script lang="ts" setup>
import {ref} from 'vue';
import type {Modal} from '../elements.ts';
import type {RenderAPI} from '../../types.ts';

const {api} = defineProps<{api: RenderAPI}>();

const count = ref(0);
const modal = ref<InstanceType<typeof Modal>>();

function handlePress() {
  count.value += 1;
}

function handleClose() {
  if (count.value > 0) {
    api.alert(`You clicked ${count.value} times!`);
  }

  count.value = 0;
}

function handlePrimaryAction() {
  modal.value.close();
}
</script>

<template>
  <ui-stack spacing>
    <ui-text>
      Rendering example: <ui-text emphasis>{{ api.example }}</ui-text>
    </ui-text>
    <ui-text>
      Rendering in sandbox: <ui-text emphasis>{{ api.sandbox }}</ui-text>
    </ui-text>

    <ui-button>
      Open modal

      <ui-modal ref="modal" slot="modal" @close="handleClose">
        <ui-text>
          Click count: <ui-text emphasis>{{ count }}</ui-text>
        </ui-text>
        <ui-button @press="handlePress">Click me!</ui-button>
        <ui-button slot="primaryAction" @press="handlePrimaryAction">
          Close
        </ui-button>
      </ui-modal>
    </ui-button>
  </ui-stack>
</template>
