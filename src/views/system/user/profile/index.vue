<template>
  <div class="p-2">
    <el-row :gutter="20">
      <el-col :span="8" :xs="24">
        <el-card class="box-card">
          <template #header>
            <div class="clearfix">
              <span>个人信息</span>
            </div>
          </template>
          <div>
            <div class="text-center">
              <userAvatar />
            </div>
            <ul class="list-group list-group-striped">
              <li class="list-group-item">
                <svg-icon icon-class="user" />用户名称
                <div class="pull-right">{{ state.user.userName }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="phone" />手机号码
                <div class="pull-right">{{ state.user.phonenumber }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="email" />用户邮箱
                <div class="pull-right">{{ state.user.email }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="tree" />所属部门
                <div v-if="state.user.deptName" class="pull-right">{{ state.user.deptName }} / {{ state.postGroup }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="peoples" />所属角色
                <div class="pull-right">{{ state.roleGroup }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="date" />创建日期
                <div class="pull-right">{{ state.user.createTime }}</div>
              </li>
            </ul>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16" :xs="24">
        <el-card>
          <template #header>
            <div class="clearfix">
              <span>基本资料</span>
            </div>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本资料" name="userinfo">
              <userInfo :user="userForm" />
            </el-tab-pane>
            <el-tab-pane label="修改密码" name="resetPwd">
              <resetPwd />
            </el-tab-pane>
            <el-tab-pane label="第三方应用" name="thirdParty">
              <thirdParty :auths="state.auths" />
            </el-tab-pane>
            <el-tab-pane label="在线设备" name="onlineDevice">
              <onlineDevice :devices="state.devices" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Profile" lang="ts">
import UserAvatar from './userAvatar.vue';
import UserInfo from './userInfo.vue';
import ResetPwd from './resetPwd.vue';
import ThirdParty from './thirdParty.vue';
import OnlineDevice from './onlineDevice.vue';
import { getAuthList } from '@/api/system/social/auth';
import { getUserProfile } from '@/api/system/user';
import { getOnline } from '@/api/monitor/online';
import { UserVO } from '@/api/system/user/types';

const activeTab = ref('userinfo');
interface State {
  user: Partial<UserVO>;
  roleGroup: string;
  postGroup: string;
  auths: any;
  devices: any;
}
const state = ref<State>({
  user: {},
  roleGroup: '',
  postGroup: '',
  auths: [],
  devices: []
});

const userForm = ref({});

const getUser = async () => {
  const res = await getUserProfile();
  state.value.user = res.data.user;
  userForm.value = { ...res.data.user };
  state.value.roleGroup = res.data.roleGroup;
  state.value.postGroup = res.data.postGroup;
};

const getAuths = async () => {
  const res = await getAuthList();
  state.value.auths = res.data;
};
const getOnlines = async () => {
  const res = await getOnline();
  state.value.devices = res.rows;
};

onMounted(() => {
  getUser();
  getAuths();
  getOnlines();
});
</script>

<style scoped>
/* 调整整体容器间距 */
.p-2 {
  padding: 24px;
}

/* 调整卡片间距 */
.box-card {
  margin-bottom: 24px;
}

/* 调整个人信息卡片内边距 */
.box-card .text-center {
  margin: 20px 0;
}

/* 调整列表项间距 */
.list-group {
  margin-top: 20px;
}

.list-group-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.list-group-item:hover {
  background-color: #f5f7fa;
}

/* 调整右侧卡片内边距 */
.el-card {
  padding: 20px;
}

/* 调整标签页内容间距 */
.el-tabs {
  margin-top: 16px;
}
</style>
