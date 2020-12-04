<template>
  <argo-button :disabled="disabled" @press="toggle"><slot></slot></argo-button>
</template>

<script lang="ts">
import {Button as ArgoButton} from '../remote-components';

export default {
  components: {
    ArgoButton,
  },
  emits: ['press'],
  data() {
    return {
      disabled: false,
    };
  },
  methods: {
    toggle() {
      this.disabled = !this.disabled;
      this.$emit('press');
    },
  },
};
</script>
