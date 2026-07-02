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
          <el-button type="primary" :icon="Search" :disabled="!sceneId" @click="refreshActivePanel">查询</el-button>
          <el-button :icon="Refresh" @click="resetSceneQuery">重置</el-button>
          <span v-if="currentScene" class="scene-meta">
            编号 {{ currentScene.factoryId || currentScene.id }} · 比例尺 {{ currentScene.scale || 1 }} mm/px
          </span>
        </div>
      </div>
    </transition>

    <el-card v-if="!sceneId" shadow="never" class="empty-card">
      <el-empty description="请先选择场景，再管理该场景下的点位、路径与区域" />
    </el-card>

    <el-card v-else shadow="never">
      <el-tabs v-model="activeTab" class="masterdata-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="点位管理" name="points">
          <LocationPanel ref="pointsPanelRef" :scene-id="sceneId" :scene-name="currentScene?.name" />
        </el-tab-pane>
        <el-tab-pane label="路径管理" name="paths">
          <PathPanel ref="pathsPanelRef" :scene-id="sceneId" :scene-name="currentScene?.name" />
        </el-tab-pane>
        <el-tab-pane label="区域管理" name="regions">
          <BlockPanel ref="regionsPanelRef" :scene-id="sceneId" :scene-name="currentScene?.name" />
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
import BlockPanel from './components/BlockPanel.vue';
import { useMapSceneContext } from './composables/useMapSceneContext';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const route = useRoute();
const router = useRouter();

const showSearch = ref(true);
const activeTab = ref('points');
const pointsPanelRef = ref<InstanceType<typeof LocationPanel>>();
const pathsPanelRef = ref<InstanceType<typeof PathPanel>>();
const regionsPanelRef = ref<InstanceType<typeof BlockPanel>>();

const {
  scenes,
  sceneId,
  currentScene,
  loadingScenes,
  loadScenes,
} = useMapSceneContext();

const tabFromQuery = () => {
  const tab = `${route.query.tab ?? ''}`;
  if (tab === 'points' || tab === 'paths' || tab === 'regions') {
    activeTab.value = tab;
  }
};

const refreshActivePanel = () => {
  if (activeTab.value === 'points') pointsPanelRef.value?.reload();
  else if (activeTab.value === 'paths') pathsPanelRef.value?.reload();
  else regionsPanelRef.value?.reload();
};

const handleSceneChange = () => {
  refreshActivePanel();
};

const resetSceneQuery = async () => {
  sceneId.value = scenes.value[0]?.id;
  await loadScenes();
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
  refreshActivePanel();
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
