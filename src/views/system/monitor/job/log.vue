<template>
  <div class="p-4">
    <!-- 搜索区域 -->
    <div v-show="showSearch" class="mb-3">
      <el-card shadow="hover">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true">
          <el-form-item label="任务名称" prop="jobName">
            <el-input v-model="queryParams.jobName" placeholder="请输入任务名称" clearable @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="任务组名" prop="jobGroup">
            <el-select v-model="queryParams.jobGroup" placeholder="请选择" clearable style="width: 140px">
              <el-option label="DEFAULT" value="DEFAULT" />
              <el-option label="SYSTEM" value="SYSTEM" />
            </el-select>
          </el-form-item>
          <el-form-item label="执行状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 120px">
              <el-option label="成功" value="0" />
              <el-option label="失败" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <el-card shadow="hover">
      <template #header>
        <div class="toolbar">
          <div class="toolbar-left">
            <el-button type="danger" plain :icon="Delete" @click="handleClean">清空日志</el-button>
            <el-button plain :icon="Back" @click="goBack">返回任务</el-button>
          </div>
          <div class="toolbar-right">
            <el-tooltip :content="showSearch ? '隐藏搜索' : '显示搜索'" placement="top">
              <el-button :icon="Search" circle @click="showSearch = !showSearch" />
            </el-tooltip>
            <el-tooltip content="刷新" placement="top">
              <el-button :icon="Refresh" circle @click="handleRefresh" />
            </el-tooltip>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="jobLogId" label="日志编号" width="90" align="center" />
        <el-table-column prop="jobName" label="任务名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="jobGroup" label="任务组名" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.jobGroup === 'DEFAULT' ? undefined : 'warning'">{{ row.jobGroup }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="invokeTarget" label="调用目标" min-width="200" show-overflow-tooltip />
        <el-table-column prop="jobMessage" label="执行信息" min-width="160" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === '0' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === '0' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="执行时间" width="160" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="详情" placement="top">
              <el-button link type="primary" :icon="View" @click="handleDetail(row)" />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="getList"
          @current-change="getList"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="执行日志详情"
      append-to-body
      destroy-on-close
      width="600px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="日志编号">{{ currentLog.jobLogId }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ currentLog.jobName }}</el-descriptions-item>
        <el-descriptions-item label="任务组名">{{ currentLog.jobGroup }}</el-descriptions-item>
        <el-descriptions-item label="调用目标">{{ currentLog.invokeTarget }}</el-descriptions-item>
        <el-descriptions-item label="执行信息">{{ currentLog.jobMessage }}</el-descriptions-item>
        <el-descriptions-item label="执行状态">
          <el-tag :type="currentLog.status === '0' ? 'success' : 'danger'">
            {{ currentLog.status === '0' ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="异常信息" v-if="currentLog.exceptionInfo">
          <el-text type="danger" class="exception-text">{{ currentLog.exceptionInfo }}</el-text>
        </el-descriptions-item>
        <el-descriptions-item label="执行时间">{{ currentLog.createTime }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Delete, Search, Refresh, View, Back } from '@element-plus/icons-vue'
import { listJobLog, delJobLog, cleanJobLog, type JobLog } from '@/api/monitor/job'

const router = useRouter()
const route = useRoute()
const queryFormRef = ref<FormInstance>()

const loading = ref(false)
const showSearch = ref(true)
const total = ref(0)
const tableData = ref<JobLog[]>([])
const detailVisible = ref(false)
const currentLog = ref<Partial<JobLog>>({})

const queryParams = reactive({
  jobName: (route.query.jobName as string) || undefined as string | undefined,
  jobGroup: (route.query.jobGroup as string) || undefined as string | undefined,
  status: undefined as string | undefined,
  pageNum: 1,
  pageSize: 10,
})

const getList = async () => {
  loading.value = true
  try {
    const res = await listJobLog(queryParams)
    // Backend returns R<IPage<SysJobLog>>; res.data is a MyBatis-Plus Page object
    const page = res.data ?? {}
    tableData.value = page.records ?? []
    total.value = page.total ?? tableData.value.length
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const handleRefresh = () => {
  resetQuery()
}

const handleDetail = (row: JobLog) => {
  currentLog.value = { ...row }
  detailVisible.value = true
}

const handleDelete = async (row: JobLog) => {
  await ElMessageBox.confirm(`确定删除该执行日志吗？`, '删除确认', { type: 'warning' })
  await delJobLog(row.jobLogId)
  ElMessage.success('删除成功')
  getList()
}

const handleClean = async () => {
  await ElMessageBox.confirm('确定清空所有执行日志吗？此操作不可恢复！', '清空确认', { type: 'warning' })
  await cleanJobLog()
  ElMessage.success('日志已清空')
  getList()
}

const goBack = () => router.push('/system/monitor/job')

onMounted(() => getList())
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.exception-text {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
