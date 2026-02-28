<template>
  <div class="navbar">
    <div class="navbar-left">
      <hamburger id="hamburger-container" :is-active="appStore.sidebar.opened" class="hamburger-container" @toggle-click="toggleSideBar" />
      <breadcrumb v-if="!settingsStore.topNav" id="breadcrumb-container" class="breadcrumb-container" />
      <top-nav v-if="settingsStore.topNav" id="topmenu-container" class="topmenu-container" />
    </div>

    <div class="right-menu">
      <template v-if="appStore.device !== 'mobile'">
        <el-select
          v-if="userId === 1 && tenantEnabled"
          v-model="companyName"
          class="min-w-244px"
          clearable
          filterable
          reserve-keyword
          :placeholder="proxy.$t('navbar.selectTenant')"
          @change="dynamicTenantEvent"
          @clear="dynamicClearEvent"
        >
          <el-option v-for="item in tenantList" :key="item.tenantId" :label="item.companyName" :value="item.tenantId"> </el-option>
          <template #prefix><svg-icon icon-class="company" class="el-input__icon input-icon" /></template>
        </el-select>

        <!-- <search-menu ref="searchMenuRef" />
        <el-tooltip content="搜索" effect="dark" placement="bottom">
          <div class="right-menu-item hover-effect" @click="openSearchMenu">
            <svg-icon class-name="search-icon" icon-class="search" />
          </div>
        </el-tooltip> -->
        <!-- 消息 -->
        <el-tooltip :content="proxy.$t('navbar.message')" effect="dark" placement="bottom">
          <div class="right-menu-item hover-effect">
            <el-popover placement="bottom" trigger="click" transition="el-zoom-in-top" :width="300" :persistent="false">
              <template #reference>
                <el-badge :value="newNotice > 0 ? newNotice : ''" :max="99">
                  <svg-icon icon-class="message" />
                </el-badge>
              </template>
              <template #default>
                <notice></notice>
              </template>
            </el-popover>
          </div>
        </el-tooltip>


        <el-tooltip :content="proxy.$t('navbar.document')" effect="dark" placement="bottom">
          <div class="right-menu-item hover-effect">
            <ruo-yi-doc id="ruoyi-doc" />
          </div>
        </el-tooltip>

      </template>
      <div class="right-menu-item hover-effect avatar-item">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="avatar-wrapper">
            <img :src="userStore.avatar" class="user-avatar" />
            <el-icon><caret-bottom /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <router-link v-if="!dynamic" to="/user/profile">
                <el-dropdown-item>{{ proxy.$t('navbar.personalCenter') }}</el-dropdown-item>
              </router-link>
              <el-dropdown-item v-if="settingsStore.showSettings" command="setLayout">
                <span>{{ proxy.$t('navbar.layoutSetting') }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <span>{{ proxy.$t('navbar.logout') }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SearchMenu from './TopBar/search.vue';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { useSettingsStore } from '@/store/modules/settings';
import { useNoticeStore } from '@/store/modules/notice';
import { getTenantList } from '@/api/login';
import { dynamicClear, dynamicTenant } from '@/api/system/tenant';
import { TenantVO } from '@/api/types';
import notice from './notice/index.vue';
import router from '@/router';
import { ElMessageBoxOptions } from 'element-plus/es/components/message-box/src/message-box.type';

const appStore = useAppStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();
const noticeStore = storeToRefs(useNoticeStore());
const newNotice = ref(<number>0);

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const userId = ref(userStore.userId);
const companyName = ref(undefined);
const tenantList = ref<TenantVO[]>([]);
// 是否切换了租户
const dynamic = ref(false);
// 租户开关
const tenantEnabled = ref(true);
// 搜索菜单
const searchMenuRef = ref<InstanceType<typeof SearchMenu>>();

const openSearchMenu = () => {
  searchMenuRef.value?.openSearch();
};

// 动态切换
const dynamicTenantEvent = async (tenantId: string) => {
  if (companyName.value != null && companyName.value !== '') {
    await dynamicTenant(tenantId);
    dynamic.value = true;
    await proxy?.$router.push('/');
    await proxy?.$tab.closeAllPage();
    await proxy?.$tab.refreshPage();
  }
};

const dynamicClearEvent = async () => {
  await dynamicClear();
  dynamic.value = false;
  await proxy?.$router.push('/');
  await proxy?.$tab.closeAllPage();
  await proxy?.$tab.refreshPage();
};

/** 租户列表 */
const initTenantList = async () => {
  const { data } = await getTenantList(true);
  tenantEnabled.value = data.tenantEnabled === undefined ? true : data.tenantEnabled;
  if (tenantEnabled.value) {
    tenantList.value = data.voList;
  }
};

defineExpose({
  initTenantList
});

const toggleSideBar = () => {
  appStore.toggleSideBar(false);
};

const logout = async () => {
  await ElMessageBox.confirm('确定注销并退出系统吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  } as ElMessageBoxOptions);
  userStore.logout().then(() => {
    router.replace({
      path: '/login',
      query: {
        redirect: encodeURIComponent(router.currentRoute.value.fullPath || '/')
      }
    });
    proxy?.$tab.closeAllPage();
  });
};

const emits = defineEmits(['setLayout']);
const setLayout = () => {
  emits('setLayout');
};
// 定义Command方法对象 通过key直接调用方法
const commandMap: { [key: string]: any } = {
  setLayout,
  logout
};
const handleCommand = (command: string) => {
  // 判断是否存在该方法
  if (commandMap[command]) {
    commandMap[command]();
  }
};
//用深度监听 消息
watch(
  () => noticeStore.state.value.notices,
  (newVal) => {
    newNotice.value = newVal.filter((item: any) => !item.read).length;
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
:deep(.el-select .el-input__wrapper) {
  height: 32px;
  border-radius: var(--radius-md);
}

:deep(.el-badge__content.is-fixed) {
  top: 10px;
  right: 8px;
}

.flex {
  display: flex;
}

.align-center {
  align-items: center;
}

.navbar {
  height: var(--navbar-height);
  overflow: hidden;
  position: relative;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  transition: var(--transition-all);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .navbar-left {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .hamburger-container {
    height: 100%;
    cursor: pointer;
    transition: var(--transition-all);
    padding: 0 var(--spacing-3);
    border-radius: var(--radius-md);
    margin: var(--spacing-2);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--bg-secondary);
      transform: scale(1.05);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }

  .breadcrumb-container {
    padding: 0 var(--spacing-3);
    height: 100%;
    display: flex;
    align-items: center;
  }

  .topmenu-container {
    height: 100%;
    display: flex;
    align-items: center;
  }

  .errLog-container {
    display: flex;
    align-items: center;
  }

  .right-menu {
    height: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-1);

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--spacing-3);
      height: 40px;
      font-size: 20px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-all);
      border-radius: var(--radius-md);
      position: relative;

      &.hover-effect {
        &:hover {
          background: var(--bg-secondary);
          color: var(--primary-500);
          transform: translateY(-1px);
        }
        
        &:active {
          transform: translateY(0);
        }
      }
      
      .svg-icon {
        transition: var(--transition-transform);
      }
      
      &:hover .svg-icon {
        transform: scale(1.1);
      }
    }

    .avatar-item {
      margin-right: var(--spacing-6);

      .avatar-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-1);
        border-radius: var(--radius-lg);
        transition: var(--transition-all);
        cursor: pointer;

        &:hover {
          background: var(--bg-secondary);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-lg);
          border: 2px solid var(--border-default);
          transition: var(--transition-all);
          object-fit: cover;
          
          &:hover {
            border-color: var(--primary-500);
            transform: scale(1.05);
          }
        }

        .el-icon {
          font-size: 14px;
          color: var(--text-tertiary);
          transition: var(--transition-transform);
        }
        
        &:hover .el-icon {
          transform: rotate(180deg);
        }
      }
    }
  }
}

// 下拉菜单优化
:deep(.el-dropdown-menu) {
  padding: var(--spacing-2);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  
  .el-dropdown-menu__item {
    border-radius: var(--radius-md);
    padding: var(--spacing-2) var(--spacing-4);
    margin: var(--spacing-1) 0;
    transition: var(--transition-all);
    
    &:hover {
      background: var(--bg-secondary);
      color: var(--primary-500);
      transform: translateX(4px);
    }
  }
  
  .el-dropdown-menu__item--divided {
    border-top: 1px solid var(--border-light);
    margin-top: var(--spacing-2);
    padding-top: var(--spacing-2);
  }
}

// 消息徽章优化
:deep(.el-badge) {
  .el-badge__content {
    background-color: var(--danger-500);
    border: 2px solid var(--bg-primary);
    font-weight: var(--font-weight-semibold);
    font-size: 11px;
    height: 18px;
    line-height: 14px;
    padding: 0 5px;
  }
}

// 租户选择器优化
:deep(.el-select) {
  .el-input__wrapper {
    background: var(--bg-secondary);
    border: 1px solid var(--border-default);
    transition: var(--transition-all);
    
    &:hover {
      border-color: var(--primary-500);
      background: var(--bg-primary);
    }
    
    &.is-focus {
      border-color: var(--primary-500);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
  
  .el-input__inner {
    font-weight: var(--font-weight-medium);
  }
}
</style>
