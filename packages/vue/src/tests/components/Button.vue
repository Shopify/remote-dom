<template>
  <button :disabled="disabled" @click="$emit('press')">
    <slot></slot>
  </button>
</template>

<script lang="ts">
export default {
  name: 'Button',
  emits: ['press'],
  props: ['disabled'],
};
</script>
