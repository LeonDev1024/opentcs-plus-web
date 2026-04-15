<template>
  <el-dialog
    v-model="visible"
    width="860px"
    :show-close="true"
    class="guide-dialog"
    :close-on-click-modal="true"
    align-center
  >
    <!-- 头部 -->
    <template #header>
      <div class="guide-header">
        <div>
          <h2 class="guide-title">欢迎使用 OPENTCSPLUS 调度管理平台</h2>
          <p class="guide-subtitle">企业级 AGV 智能调度系统，现在开始你的智慧物流之旅</p>
        </div>
      </div>
    </template>

    <div class="guide-body">
      <!-- 各角色工作流程 -->
      <div class="section">
        <h3 class="section-title">各角色工作流程</h3>
        <div class="role-list-card">
          <div class="role-list">
          <div v-for="role in roles" :key="role.name" class="role-row">
            <div class="role-avatar" :style="{ background: role.color }">
              <el-icon><component :is="role.icon" /></el-icon>
            </div>
            <div class="role-name">{{ role.name }}</div>
            <div class="role-steps">
              <span
                v-for="(step, i) in role.steps"
                :key="i"
                class="step-chip"
                :style="{
                  background: role.color + '18',
                  borderColor: role.color + '30',
                  color: role.color
                }"
              >{{ step }}</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- 快速开始 -->
      <div class="section section-start">
        <h3 class="section-title">快速开始部署</h3>
        <p class="section-desc">
          系统支持 Docker 一键部署，5 分钟即可完成环境搭建。首次部署请按照
          <strong>部署人员</strong> 的工作流程依次完成配置，之后各角色即可独立使用系统。
          如需企业级定制支持，欢迎联系我们。
        </p>
        <div class="quick-links">
          <div class="quick-link-item" v-for="link in quickLinks" :key="link.label">
            <el-icon :style="{ color: link.color }"><component :is="link.icon" /></el-icon>
            <span>{{ link.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="guide-footer">
        <el-button class="btn-doc" @click="openDoc">查看使用文档</el-button>
        <el-button type="primary" class="btn-start" @click="handleStart">开始使用</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Tools,
  Monitor,
  DataAnalysis,
  Setting,
  Document,
  Link,
  Promotion,
  VideoCamera
} from '@element-plus/icons-vue';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visible = ref(props.modelValue);

watch(() => props.modelValue, (val) => { visible.value = val; });
watch(visible, (val) => { emit('update:modelValue', val); });

const roles = [
  {
    name: '部署人员',
    icon: 'Tools',
    color: '#2563eb',
    steps: ['配置环境', '导入地图', '注册车辆', '配置通信', '验证连通', '上线发布']
  },
  {
    name: '运维人员',
    icon: 'Monitor',
    color: '#7c3aed',
    steps: ['监控车辆', '处理告警', '查看日志', '系统检查', '故障处理', '性能分析']
  },
  {
    name: '运营人员',
    icon: 'DataAnalysis',
    color: '#0891b2',
    steps: ['创建订单', '分配任务', '跟踪进度', '查看报表', '优化调度', '导出数据']
  },
  {
    name: '系统管理员',
    icon: 'Setting',
    color: '#059669',
    steps: ['用户管理', '权限配置', '系统参数', '字典维护', '日志审计', '版本更新']
  }
];

const quickLinks = [
  { icon: 'Document', label: '部署文档', color: '#2563eb' },
  { icon: 'Link', label: 'GitHub 开源', color: '#374151' },
  { icon: 'Promotion', label: '企业版咨询', color: '#d97706' },
  { icon: 'VideoCamera', label: '演示视频', color: '#7c3aed' }
];

const openDoc = () => {
  // 打开文档链接
  visible.value = false;
};

const handleStart = () => {
  visible.value = false;
};
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: var(--shadow-modal);
  padding: 0;

  .el-dialog__header {
    padding: 28px 28px 20px;
    margin: 0;
    border-bottom: 1px solid var(--border-light);
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-dialog__footer {
    padding: 16px 28px 24px;
    border-top: 1px solid var(--border-light);
  }

  .el-dialog__headerbtn {
    top: 20px;
    right: 20px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    transition: var(--transition-all);
    &:hover {
      background: var(--bg-secondary);
    }
  }
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;

  .guide-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    margin: 0 0 6px;
    letter-spacing: var(--letter-spacing-tight);
  }

  .guide-subtitle {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin: 0;
  }
}

.guide-body {
  padding: 24px 28px 20px;
  max-height: 420px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 2px;
  }
}

.section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 14px;
}

.role-list-card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: 16px;
  background: var(--bg-secondary);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 34px;

  .role-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    font-size: 14px;
  }

  .role-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    width: 64px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .role-steps {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }

  .step-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: var(--font-weight-medium);
    transition: var(--transition-all);
    cursor: default;
    white-space: nowrap;

    &:hover {
      opacity: 0.8;
    }
  }
}

.section-start {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  padding: 16px;
  border: 1px solid var(--border-light);
}

.section-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0 0 14px;

  strong {
    color: var(--text-primary);
  }
}

.quick-links {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;

  .quick-link-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition-colors);

    &:hover {
      color: var(--primary-500);
    }

    .el-icon {
      font-size: 15px;
    }
  }
}

.guide-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  .btn-doc {
    border-color: var(--border-default);
    color: var(--text-secondary);
    padding: 0 20px;
    height: 36px;
    border-radius: var(--radius-lg);
    &:hover {
      border-color: var(--primary-500);
      color: var(--primary-500);
    }
  }

  .btn-start {
    padding: 0 28px;
    height: 36px;
    border-radius: var(--radius-lg);
    font-weight: var(--font-weight-medium);
    background: var(--primary-500);
    border-color: var(--primary-500);
    &:hover {
      background: var(--primary-600);
      border-color: var(--primary-600);
    }
  }
}
</style>
