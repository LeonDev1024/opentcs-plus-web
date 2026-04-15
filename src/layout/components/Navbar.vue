<template>
  <div class="navbar" :class="{ 'navbar--dark-top': settingsStore.topNav }">
    <div class="navbar-left">
      <!-- Logo -->
      <logo :collapse="false" />
      <!-- 折叠按钮（侧边栏隐藏时不显示） -->
      <hamburger v-if="!appStore.sidebar.hide" id="hamburger-container" :is-active="appStore.sidebar.opened" class="hamburger-container" @toggle-click="toggleSideBar" />
      <!-- 路由标题 -->
      <breadcrumb v-if="!settingsStore.topNav" id="breadcrumb-container" class="breadcrumb-container" />
      <category-top-nav v-if="settingsStore.topNav" id="topmenu-container" class="topmenu-container" />
    </div>

    <div class="right-menu">
      <template v-if="appStore.device !== 'mobile'">
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
            <!-- 使用昵称首字母头像，蓝底白字 -->
            <UserAvatarInitial :nickname="userStore.nickname" :name="userStore.name" size="sm" />
            <el-icon><caret-bottom /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <router-link to="/user/profile">
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
import CategoryTopNav from '@/components/CategoryTopNav/index.vue';
import UserAvatarInitial from '@/components/UserAvatarInitial/index.vue';
import Logo from './Sidebar/Logo.vue';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { useSettingsStore } from '@/store/modules/settings';
import { useNoticeStore } from '@/store/modules/notice';
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
// 搜索菜单
const searchMenuRef = ref<InstanceType<typeof SearchMenu>>();

const openSearchMenu = () => {
  searchMenuRef.value?.openSearch();
};

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
    gap: var(--spacing-2);
  }

  .hamburger-container {
    height: 100%;
    cursor: pointer;
    transition: var(--transition-all);
    padding: 0 var(--spacing-2);
    border-radius: var(--radius-md);
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

    :deep(.hamburger) {
      fill: var(--text-secondary);
      transition: fill var(--duration-200) var(--ease-in-out);
    }
  }

  .breadcrumb-container {
    padding: 0 var(--spacing-2);
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

/* 顶部导航：深色；侧边栏由 Sidebar 组件单独控制为浅色 */
.navbar--dark-top {
  background: var(--menuBg);
  border-bottom-color: rgba(203, 213, 225, 0.16);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.45);

  :deep(.sidebar-title-main) {
    color: #ffffff !important;
  }
  :deep(.sidebar-title-sub) {
    color: #ffffff !important;
  }

  :deep(.el-breadcrumb__inner),
  :deep(.el-breadcrumb__separator) {
    color: rgba(226, 232, 240, 0.75) !important;
  }

  .hamburger-container:hover {
    background: var(--menuHover);
  }

  .hamburger-container {
    :deep(.hamburger) {
      fill: rgba(241, 245, 249, 0.9);
    }
  }

  .right-menu {
    .right-menu-item {
      color: rgba(226, 232, 240, 0.78);

      &.hover-effect:hover {
        background: var(--menuHover);
        color: #ffffff;
      }
    }
  }
}
</style>
