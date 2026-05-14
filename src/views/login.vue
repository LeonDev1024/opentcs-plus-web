<template>
  <div class="login-container">
    <div class="login-card">
      <!-- 左侧品牌区 -->
      <div class="login-brand">
        <div class="brand-content">
          <h1 class="brand-title">{{ $t('login.title') }}</h1>
          <p class="brand-subtitle">{{ $t('login.subtitle') }}</p>
          <div class="feature-grid">
            <div v-for="feature in features" :key="feature.key" class="feature-item">
              <div class="feature-icon-wrap">
                <el-icon class="feature-icon"><component :is="feature.icon" /></el-icon>
              </div>
              <span class="feature-label">{{ $t(feature.key) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="login-form-panel">
        <div class="form-header">
          <lang-select class="language-select" />
        </div>
        <div class="form-body">
          <h2 class="form-title">{{ $t('login.welcome') }}</h2>
          <p class="form-subtitle">{{ $t('login.welcomeHint') }}</p>

          <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form" size="large">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" type="text" :placeholder="proxy.$t('login.username')">
                <template #prefix>
                  <el-icon class="input-icon"><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                show-password
                :placeholder="proxy.$t('login.password')"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <el-icon class="input-icon"><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item v-if="captchaEnabled" prop="code">
              <div class="captcha-row">
                <el-input
                  v-model="loginForm.code"
                  :placeholder="proxy.$t('login.code')"
                  @keyup.enter="handleLogin"
                >
                  <template #prefix>
                    <el-icon class="input-icon"><CircleCheck /></el-icon>
                  </template>
                </el-input>
                <div class="captcha-img" @click="getCode">
                  <img v-if="codeUrl" :src="codeUrl" class="captcha-image" />
                  <span v-else class="captcha-loading">{{ $t('login.loading') }}</span>
                </div>
              </div>
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="loginForm.rememberMe">{{ proxy.$t('login.rememberPassword') }}</el-checkbox>
            </el-form-item>
            <el-form-item>
              <el-button :loading="loading" type="primary" class="login-button" @click.prevent="handleLogin">
                <span v-if="!loading">{{ proxy.$t('login.login') }}</span>
                <span v-else>{{ proxy.$t('login.logging') }}</span>
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <div class="login-footer">
      <span>Copyright © 2026 lyc All Rights Reserved.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCodeImg } from '@/api/login';
import { useUserStore } from '@/store/modules/user';
import { LoginData } from '@/api/types';
import { to } from 'await-to-js';
import { useI18n } from 'vue-i18n';
import { User, Lock, CircleCheck, Guide, Connection, Tickets, DataAnalysis } from '@element-plus/icons-vue';
import LangSelect from '@/components/LangSelect/index.vue';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;

const title = import.meta.env.VITE_APP_TITLE;
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();

const features = [
  { key: 'login.feature.path', icon: Guide },
  { key: 'login.feature.task', icon: Tickets },
  { key: 'login.feature.multibot', icon: Connection },
  { key: 'login.feature.analytics', icon: DataAnalysis }
];

const loginForm = ref<LoginData>({
  username: 'admin',
  password: 'admin123',
  rememberMe: false,
  code: '',
  uuid: ''
} as LoginData);

const loginRules: ElFormRules = {
  username: [{ required: true, trigger: 'blur', message: t('login.rule.username.required') }],
  password: [{ required: true, trigger: 'blur', message: t('login.rule.password.required') }],
  code: [{ required: true, trigger: 'change', message: t('login.rule.code.required') }]
};

const codeUrl = ref('');
const loading = ref(false);
const captchaEnabled = ref(true);
const redirect = ref('/');
const loginRef = ref<ElFormInstance>();

watch(
  () => router.currentRoute.value,
  (newRoute: any) => {
    redirect.value = newRoute.query && newRoute.query.redirect && decodeURIComponent(newRoute.query.redirect);
  },
  { immediate: true }
);

const handleLogin = () => {
  loginRef.value?.validate(async (valid: boolean, fields: any) => {
    if (valid) {
      loading.value = true;
      if (loginForm.value.rememberMe) {
        localStorage.setItem('username', String(loginForm.value.username));
        localStorage.setItem('password', String(loginForm.value.password));
        localStorage.setItem('rememberMe', String(loginForm.value.rememberMe));
      } else {
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        localStorage.removeItem('rememberMe');
      }
      const [err] = await to(userStore.login(loginForm.value));
      if (!err) {
        const redirectUrl = redirect.value || '/';
        await router.push(redirectUrl);
        loading.value = false;
      } else {
        loading.value = false;
        if (captchaEnabled.value) {
          await getCode();
        }
      }
    } else {
      console.error('error submit!', fields);
    }
  });
};

const getCode = async () => {
  const res = await getCodeImg();
  const { data } = res;
  captchaEnabled.value = data.captchaEnabled === undefined ? true : data.captchaEnabled;
  if (captchaEnabled.value) {
    codeUrl.value = 'data:image/gif;base64,' + data.img;
    loginForm.value.uuid = data.uuid;
  }
};

const getLoginData = () => {
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  const rememberMe = localStorage.getItem('rememberMe');
  loginForm.value = {
    username: username === null ? String(loginForm.value.username) : username,
    password: password === null ? String(loginForm.value.password) : String(password),
    rememberMe: rememberMe === null ? false : Boolean(rememberMe)
  } as LoginData;
};

onMounted(() => {
  getCode();
  getLoginData();
});
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 40px 20px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0d1b3e 0%, #112244 50%, #0d2a5e 100%);
  position: relative;
}

.login-card {
  display: flex;
  width: 100%;
  max-width: 1100px;
  min-height: 580px;
  border-radius: 16px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
}

/* 左侧品牌区 */
.login-brand {
  flex: 1;
  background: linear-gradient(160deg, #1a3a72 0%, #162d5e 50%, #0f2350 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 60px;
  border-radius: 16px 0 0 16px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }
}

.brand-content {
  position: relative;
  text-align: center;
  color: #fff;
}

.brand-title {
  margin: 0 0 12px 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.brand-subtitle {
  margin: 0 0 40px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}

.feature-grid {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 32px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.feature-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.feature-icon {
  font-size: 22px;
  color: #fff;
}

.feature-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

/* 右侧表单区 */
.login-form-panel {
  width: 450px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 0 16px 16px 0;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 0;
}

.language-select {
  cursor: pointer;
  font-size: 16px;
  color: #666;
}

.form-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 40px 40px;
}

.form-title {
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 600;
  color: #1a1a2e;
  text-align: center;
}

.form-subtitle {
  margin: 0 0 32px 0;
  font-size: 14px;
  color: #999;
  text-align: center;
}

.login-form {
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    padding: 4px 12px;
  }

  :deep(.el-input) {
    --el-input-height: 46px;
  }

  .input-icon {
    font-size: 16px;
    color: #bbb;
  }
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;

  :deep(.el-input) {
    flex: 1;
  }
}

.captcha-img {
  flex-shrink: 0;
  width: 140px;
  height: 46px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;

  &:hover {
    border-color: #409eff;
  }
}

.captcha-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-loading {
  font-size: 12px;
  color: #999;
}

.login-button {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background: #1677ff;
  border-color: #1677ff;
  letter-spacing: 4px;
  transition: all 0.25s;

  &:hover {
    background: #4096ff;
    border-color: #4096ff;
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.35);
  }
}

.login-footer {
  position: fixed;
  bottom: 20px;
  width: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}
</style>
