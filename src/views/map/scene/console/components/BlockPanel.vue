<template>
  <div class="block-panel">
    <div class="block-panel__toolbar">
      <el-button type="primary" size="small" @click="createBlock">新建 Block</el-button>
    </div>

    <el-empty v-if="blocks.length === 0" description="暂无 Block，可新建或从选中点/路径加入" :image-size="72" />

    <div v-for="block in blocks" :key="block.id" class="block-card">
      <div class="block-card__header">
        <el-color-picker v-model="block.color" size="small" @change="() => persist(block)" />
        <el-input
          v-model="block.name"
          size="small"
          class="block-card__name"
          @change="() => persist(block)"
        />
        <el-button link type="danger" size="small" @click="remove(block.id)">删除</el-button>
      </div>

      <el-select
        v-model="block.type"
        size="small"
        class="block-card__type"
        @change="() => persist(block)"
      >
        <el-option label="单车互斥" value="SINGLE_VEHICLE_ONLY" />
        <el-option label="同向通行" value="SAME_DIRECTION_ONLY" />
      </el-select>

      <div class="block-card__members">
        <div class="block-card__members-title">
          成员（{{ block.members.length }}）
          <el-button link type="primary" size="small" @click="addSelectedToBlock(block)">加入选中</el-button>
        </div>
        <div v-if="block.members.length === 0" class="block-card__hint">暂无成员</div>
        <div v-for="member in block.members" :key="member" class="block-card__member">
          <span>{{ member }}</span>
          <el-button link type="danger" size="small" @click="removeMember(block, member)">移除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useMapEditorStore } from '@/store/modules/mapEditor';
import type { MapBlock } from '@/types/mapEditor';

const store = useMapEditorStore();
const blocks = computed(() => store.blocks);

const createBlock = () => {
  store.addBlock({
    name: `Block-${store.blocks.length + 1}`,
    type: 'SINGLE_VEHICLE_ONLY',
    members: [],
    color: '#F44336',
    properties: {}
  });
};

const persist = (block: MapBlock) => {
  store.updateBlock(block.id, {
    name: block.name,
    type: block.type,
    color: block.color,
    members: [...block.members],
    properties: block.properties
  });
};

const remove = (id: string) => {
  store.deleteBlock(id);
};

const selectedNames = (): string[] => {
  const names: string[] = [];
  for (const id of store.selection.selectedIds) {
    const point = store.points.find((p) => p.id === id);
    if (point?.name) {
      names.push(point.name);
      continue;
    }
    const path = store.paths.find((p) => p.id === id);
    if (path?.name) {
      names.push(path.name);
    }
  }
  return names;
};

const addSelectedToBlock = (block: MapBlock) => {
  const names = selectedNames();
  if (names.length === 0) {
    ElMessage.warning('请先选中点位或路径');
    return;
  }
  const merged = Array.from(new Set([...block.members, ...names]));
  store.updateBlock(block.id, { members: merged });
};

const removeMember = (block: MapBlock, member: string) => {
  store.updateBlock(block.id, {
    members: block.members.filter((m) => m !== member)
  });
};
</script>

<style scoped lang="scss">
.block-panel {
  padding: 12px;
  height: 100%;
  overflow: auto;
}

.block-panel__toolbar {
  margin-bottom: 12px;
}

.block-card {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
}

.block-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.block-card__name {
  flex: 1;
}

.block-card__type {
  width: 100%;
  margin-bottom: 8px;
}

.block-card__members-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.block-card__member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 2px 0;
}

.block-card__hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
