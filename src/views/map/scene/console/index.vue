<template>
  <div class="map-console-page">
    <MapEditorTabs />
  </div>
</template>

<script setup lang="ts" name="MapConsole">
import MapEditorTabs from './MapEditorTabs.vue';
</script>

<style scoped lang="scss">
.map-console-page {
  height: 100%;
  overflow: hidden;
}
</style>
