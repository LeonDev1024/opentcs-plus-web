<template>
  <!-- 普通模式：工厂坐标轴 O(0,0)（实线）+ 地图原点虚线 -->
  <template v-if="!isEditingOrigin">
    <div class="layer-axis">
      <div class="axis-line axis-x" />
      <div class="axis-line axis-y" />
      <div class="axis-origin">O(0,0)</div>
      <!-- 右手法则：逆时针正方向指示弧（从 +X 到 +Y 的 CCW 弧） -->
      <svg class="axis-ccw-arc" width="36" height="36" viewBox="-6 -34 36 36">
        <path d="M 28 0 A 28 28 0 0 0 0 -28" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="3 2"/>
        <polygon points="-5,-28 2,-24 2,-32" fill="#9ca3af"/>
      </svg>
    </div>

    <div
      v-if="activeMap && !isMapOriginAtFactory"
      class="layer-axis map-origin-axis"
      :style="mapOriginLayerStyle"
    >
      <div class="axis-line axis-x" />
      <div class="axis-line axis-y" />
    </div>
  </template>

  <!-- 原点编辑模式：工厂原点实线坐标轴 + 所有地图原点虚线坐标轴 -->
  <template v-else>
    <div class="layer-axis">
      <div class="axis-line axis-x" />
      <div class="axis-line axis-y" />
      <div class="axis-origin">O(0,0)</div>
      <!-- 右手法则：逆时针正方向指示弧（从 +X 到 +Y 的 CCW 弧） -->
      <svg class="axis-ccw-arc" width="36" height="36" viewBox="-6 -34 36 36">
        <path d="M 28 0 A 28 28 0 0 0 0 -28" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="3 2"/>
        <polygon points="-5,-28 2,-24 2,-32" fill="#9ca3af"/>
      </svg>
    </div>

    <div
      v-for="m in filteredMaps"
      :key="'axis-' + String(m.mapId)"
      class="layer-axis map-origin-axis"
      :style="getMapLayerOffset(m)"
    >
      <div class="axis-line axis-x" />
      <div class="axis-line axis-y" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { withDefaults, defineProps } from "vue";

type StyleObj = Record<string, any>;

interface Props {
  isEditingOrigin: boolean;
  activeMap: any | null;
  isMapOriginAtFactory: boolean;
  mapOriginLayerStyle: StyleObj;
  filteredMaps: any[];
  getMapLayerOffset: (m: any) => StyleObj;
}

withDefaults(defineProps<Props>(), {
  isEditingOrigin: false,
  activeMap: null,
  isMapOriginAtFactory: true,
  mapOriginLayerStyle: () => ({}),
  filteredMaps: () => [],
  getMapLayerOffset: () => ({}),
});
</script>

<style scoped>
.axis-ccw-arc {
  position: absolute;
  left: -6px;
  top: -34px;
  pointer-events: none;
}
</style>
