<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="online-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.ipaddr"
            placeholder="登录地址"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-input
            v-model="queryParams.userName"
            placeholder="用户名称"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table
        v-loading="loading"
        border
        :data="onlineList.slice((queryParams.pageNum - 1) * queryParams.pageSize, queryParams.pageNum * queryParams.pageSize)"
      >
        <el-table-column label="序号" width="55" type="index" align="center">
          <template #default="scope">
            <span>{{ (queryParams.pageNum - 1) * queryParams.pageSize + scope.$index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="会话编号" align="center" prop="tokenId" min-width="160" show-overflow-tooltip />
        <el-table-column label="登录名称" align="center" prop="userName" min-width="120" show-overflow-tooltip />
        <el-table-column label="客户端" align="center" prop="clientKey" min-width="100" show-overflow-tooltip />
        <el-table-column label="设备类型" align="center" width="100">
          <template #default="scope">
            <dict-tag :options="sys_device_type" :value="scope.row.deviceType" />
          </template>
        </el-table-column>
        <el-table-column label="所属部门" align="center" prop="deptName" min-width="120" show-overflow-tooltip />
        <el-table-column label="主机" align="center" prop="ipaddr" min-width="120" show-overflow-tooltip />
        <el-table-column label="登录地点" align="center" prop="loginLocation" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作系统" align="center" prop="os" min-width="100" show-overflow-tooltip />
        <el-table-column label="浏览器" align="center" prop="browser" min-width="100" show-overflow-tooltip />
        <el-table-column label="登录时间" align="center" prop="loginTime" width="180">
          <template #default="scope">
            <span>{{ proxy.parseTime(scope.row.loginTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="90" fixed="right">
          <template #default="scope">
            <el-tooltip content="强退" placement="top">
              <el-button
                v-hasPermi="['monitor:online:forceLogout']"
                link
                type="danger"
                :icon="Delete"
                @click="handleForceLogout(scope.row)"
              />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
      />
    </el-card>
  </div>
</template>

<script setup name="Online" lang="ts">
import { forceLogout, list as initData } from '@/api/system/monitor/online';
import { OnlineQuery, OnlineVO } from '@/api/system/monitor/online/types';
import { Delete, Refresh, Search } from '@element-plus/icons-vue';
import { to } from 'await-to-js';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const { sys_device_type } = toRefs<any>(proxy?.useDict('sys_device_type'));

const onlineList = ref<OnlineVO[]>([]);
const loading = ref(true);
const showSearch = ref(true);
const total = ref(0);

const queryParams = ref<OnlineQuery>({
  pageNum: 1,
  pageSize: 10,
  ipaddr: '',
  userName: ''
});

/** 查询在线用户列表 */
const getList = async () => {
  loading.value = true;
  const res = await initData(queryParams.value);
  onlineList.value = res.rows;
  total.value = res.total;
  loading.value = false;
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
};

/** 重置按钮操作 */
const resetQuery = () => {
  queryParams.value.ipaddr = '';
  queryParams.value.userName = '';
  handleQuery();
};

/** 强退按钮操作 */
const handleForceLogout = async (row: OnlineVO) => {
  const [err] = await to(proxy?.$modal.confirm('是否确认强退名称为"' + row.userName + '"的用户?') as any);
  if (!err) {
    await forceLogout(row.tokenId);
    await getList();
    proxy?.$modal.msgSuccess('强退成功');
  }
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';
</style>
