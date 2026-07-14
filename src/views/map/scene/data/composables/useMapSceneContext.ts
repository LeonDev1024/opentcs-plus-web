import { computed, ref } from 'vue';
import { listFactoryModel } from '@/api/deploy/factory/model';
import type { FactoryModelVO } from '@/api/deploy/factory/model/types';

export function useMapSceneContext() {
  const scenes = ref<FactoryModelVO[]>([]);
  const sceneId = ref<number | undefined>();
  const loadingScenes = ref(false);

  const currentScene = computed(() =>
    scenes.value.find((s) => s.id === sceneId.value),
  );

  const loadScenes = async () => {
    loadingScenes.value = true;
    try {
      const res = await listFactoryModel({ pageNum: 1, pageSize: 200, status: '0' });
      scenes.value = res.rows ?? [];
      if (!sceneId.value && scenes.value.length > 0) {
        sceneId.value = scenes.value[0].id;
      }
    } finally {
      loadingScenes.value = false;
    }
  };

  return {
    scenes,
    sceneId,
    currentScene,
    loadingScenes,
    loadScenes,
  };
}
