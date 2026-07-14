<template>
  <div class="factory-container">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="scene-filter-panel">
        <div class="query-toolbar">
          <el-select
            v-model="sceneId"
            filterable
            clearable
            placeholder="请选择场景"
            :loading="loadingScenes"
            @change="handleSceneChange"
          >
            <el-option
              v-for="scene in scenes"
              :key="scene.id"
              :label="scene.name"
              :value="scene.id"
            />
          </el-select>
          <el-input
            v-model="keyword"
            class="filter-keyword"
            :placeholder="activeTab === 'points' ? '点位编码或名称' : '路径编码或名称'"
            clearable
            @keyup.enter="refreshActivePanel"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="navigationMapId"
            class="filter-map"
            placeholder="全部地图"
            clearable
            @change="refreshActivePanel"
          >
            <el-option
              v-for="map in mapOptions"
              :key="getMapBusinessId(map)"
              :label="map.name"
              :value="getMapBusinessId(map)"
            />
          </el-select>
          <el-button type="primary" :icon="Search" :disabled="!sceneId" @click="refreshActivePanel">查询</el-button>
          <el-button :icon="Refresh" @click="resetSceneQuery">重置</el-button>
          <span v-if="currentScene" class="scene-meta">
            编号 {{ currentScene.factoryId || currentScene.id }} · 比例尺 {{ currentScene.scale || 1 }} mm/px
          </span>
        </div>
      </div>
    </transition>

    <el-card v-if="!sceneId" shadow="never" class="empty-card">
      <el-empty description="请先选择场景，再管理该场景下的点位与路径" />
    </el-card>

    <el-card v-else shadow="never">
      <el-tabs v-model="activeTab" class="masterdata-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="点位管理" name="points">
          <LocationPanel
            ref="pointsPanelRef"
            :scene-id="sceneId"
            :scene-name="currentScene?.name"
            :keyword="keyword"
            :navigation-map-id="navigationMapId"
            :maps="mapOptions"
          />
        </el-tab-pane>
        <el-tab-pane label="路径管理" name="paths">
          <PathPanel
            ref="pathsPanelRef"
            :scene-id="sceneId"
            :scene-name="currentScene?.name"
            :keyword="keyword"
            :navigation-map-id="navigationMapId"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="MapMasterData">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Refresh, Search } from '@element-plus/icons-vue';
import LocationPanel from './components/LocationPanel.vue';
import PathPanel from './components/PathPanel.vue';
import { useMapSceneContext } from './composables/useMapSceneContext';
import { listMapsByFactory } from '@/api/deploy/factory/map';
import type { NavigationMapVO } from '@/api/deploy/factory/map/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();
const router = useRouter();

const showSearch = ref(true);
const activeTab = ref('points');
const pointsPanelRef = ref<InstanceType<typeof LocationPanel>>();
const pathsPanelRef = ref<InstanceType<typeof PathPanel>>();
const keyword = ref('');
const navigationMapId = ref<number | undefined>();
const mapOptions = ref<NavigationMapVO[]>([]);

const {
  scenes,
  sceneId,
  currentScene,
  loadingScenes,
  loadScenes,
} = useMapSceneContext();

const tabFromQuery = () => {
  const tab = `${route.query.tab ?? ''}`;
  if (tab === 'points' || tab === 'paths') {
    activeTab.value = tab;
  }
};

const refreshActivePanel = () => {
  if (activeTab.value === 'points') pointsPanelRef.value?.reload();
  else pathsPanelRef.value?.reload();
};

const getMapBusinessId = (map: NavigationMapVO) => Number((map as any).mapId ?? (map as any).id);

const loadMapOptions = async () => {
  if (!sceneId.value) {
    mapOptions.value = [];
    return;
  }
  const res = await listMapsByFactory(sceneId.value);
  const data = (res as any).data ?? res;
  mapOptions.value = Array.isArray(data) ? data : [];
};

const handleSceneChange = async () => {
  navigationMapId.value = undefined;
  await loadMapOptions();
};

const resetSceneQuery = async () => {
  keyword.value = '';
  navigationMapId.value = undefined;
  await loadScenes();
  sceneId.value = scenes.value[0]?.id;
  await loadMapOptions();
  refreshActivePanel();
};

const handleTabChange = () => {
  refreshActivePanel();
};

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return;
  router.replace({ query: { ...route.query, tab } });
});

onMounted(async () => {
  tabFromQuery();
  await loadScenes();
  await loadMapOptions();
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.factory-container {
  height: 100%;
  padding: 16px;
}

.scene-meta {
  font-size: 13px;
  color: #909399;
}

.filter-keyword {
  width: 240px;
}

.filter-map {
  width: 220px;
}

.empty-card {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.masterdata-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
</style>
