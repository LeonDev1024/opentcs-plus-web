<template>
  <div class="p-2">
    <transition :enter-active-class="proxy?.animate.searchAnimate.enter" :leave-active-class="proxy?.animate.searchAnimate.leave">
      <div v-show="showSearch" class="job-filter-panel">
        <div class="query-toolbar">
          <el-input
            v-model="queryParams.jobName"
            placeholder="任务名称"
            clearable
            size="default"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="queryParams.jobGroup" placeholder="全部任务组" clearable size="default">
            <el-option label="DEFAULT" value="DEFAULT" />
            <el-option label="SYSTEM" value="SYSTEM" />
          </el-select>
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable size="default">
            <el-option label="成功" value="0" />
            <el-option label="失败" value="1" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </div>
    </transition>

    <el-card shadow="never">
      <template #header>
        <div class="action-toolbar">
          <el-button type="danger" plain :icon="Delete" @click="handleClean">清空日志</el-button>
          <el-button plain :icon="Back" @click="goBack">返回任务</el-button>
          <right-toolbar v-model:show-search="showSearch" @query-table="getList" />
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="jobLogId" label="日志编号" width="90" align="center" />
        <el-table-column prop="jobName" label="任务名称" min-width="140" align="center" show-overflow-tooltip />
        <el-table-column prop="jobGroup" label="任务组名" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.jobGroup === 'DEFAULT' ? undefined : 'warning'">{{ row.jobGroup }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="invokeTarget" label="调用目标" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="jobMessage" label="执行信息" min-width="160" align="center" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="执行时间" width="180" align="center" />
        <el-table-column label="操作" width="110" align="center" fixed="right">
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

      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="getList"
      />
    </el-card>

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
        <el-descriptions-item v-if="currentLog.exceptionInfo" label="异常信息">
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

<script setup lang="ts" name="JobLog">
import { ref, reactive, onMounted, getCurrentInstance, type ComponentInternalInstance } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Search, Refresh, View, Back } from '@element-plus/icons-vue'
import { listJobLog, delJobLog, cleanJobLog, type JobLog } from '@/api/monitor/job'

const { proxy } = getCurrentInstance() as ComponentInternalInstance
const router = useRouter()
const route = useRoute()

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
  queryParams.jobName = undefined
  queryParams.jobGroup = undefined
  queryParams.status = undefined
  handleQuery()
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

<style scoped lang="scss">
@import '@/assets/styles/device-toolbar.scss';

.exception-text {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
