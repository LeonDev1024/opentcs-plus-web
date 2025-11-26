<template>
  <div>
    <svg-icon icon-class="question" @click="goto" />
  </div>
</template>

<script setup lang="ts">
const url = ref('https://github.com/LeonDev1024/opentcs-plus-docs');

function goto() {
  window.open(url.value);
}
</script>
