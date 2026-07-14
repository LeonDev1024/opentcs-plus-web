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
            <el-select v-model="queryParams.jobGroup" placeholder="请选择任务组" clearable style="width: 140px">
              <el-option label="DEFAULT" value="DEFAULT" />
              <el-option label="SYSTEM" value="SYSTEM" />
            </el-select>
          </el-form-item>
          <el-form-item label="任务状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 120px">
              <el-option label="正常" value="0" />
              <el-option label="暂停" value="1" />
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
            <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleBatchDelete"
            >删除</el-button>
            <el-button
              type="warning"
              plain
              :icon="VideoPause"
              :disabled="selectedIds.length === 0"
              @click="handleBatchPause"
            >暂停</el-button>
            <el-button
              type="success"
              plain
              :icon="VideoPlay"
              :disabled="selectedIds.length === 0"
              @click="handleBatchResume"
            >恢复</el-button>
            <el-button plain :icon="List" @click="toJobLog">日志</el-button>
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

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column prop="jobId" label="任务编号" width="80" align="center" />
        <el-table-column prop="jobName" label="任务名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="jobGroup" label="任务组" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.jobGroup === 'DEFAULT' ? undefined : 'warning'">{{ row.jobGroup }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="invokeTarget" label="调用目标" min-width="200" show-overflow-tooltip />
        <el-table-column prop="cronExpression" label="Cron 表达式" width="150" />
        <el-table-column prop="concurrent" label="并发" width="70" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.concurrent === '0' ? 'success' : 'info'">{{ row.concurrent === '0' ? '允许' : '禁止' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === '0'"
              :loading="row._toggling"
              @change="(val) => handleToggle(row, Boolean(val))"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="修改" placement="top">
              <el-button link type="primary" :icon="Edit" @click="handleUpdate(row)" />
            </el-tooltip>
            <el-tooltip content="执行一次" placement="top">
              <el-button link type="success" :icon="CaretRight" @click="handleRun(row)" />
            </el-tooltip>
            <el-tooltip content="执行日志" placement="top">
              <el-button link type="info" :icon="List" @click="toJobLogWithFilter(row)" />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 新增/修改对话框 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      destroy-on-close
      append-to-body
      width="680px"
    >
      <el-form ref="jobFormRef" :model="form" :rules="rules" label-width="110px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="任务名称" prop="jobName">
              <el-input v-model="form.jobName" placeholder="请输入任务名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务组名" prop="jobGroup">
              <el-select v-model="form.jobGroup" style="width: 100%">
                <el-option label="DEFAULT" value="DEFAULT" />
                <el-option label="SYSTEM" value="SYSTEM" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否并发" prop="concurrent">
              <el-select v-model="form.concurrent" style="width: 100%">
                <el-option label="允许" value="0" />
                <el-option label="禁止" value="1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item prop="invokeTarget">
              <template #label>
                <span>
                  调用方法
                  <el-tooltip placement="top">
                    <template #content>
                      Bean 调用示例：ryTask.ryParams('ry')<br>
                      Class 调用示例：org.opentcs.demo.task.DemoTask.test('ry')<br>
                      参数支持字符串、布尔、长整、浮点
                    </template>
                    <el-icon style="cursor: pointer; color: var(--el-color-primary)"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="form.invokeTarget" placeholder="请输入调用目标字符串" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Cron 表达式" prop="cronExpression">
              <el-input v-model="form.cronExpression" placeholder="请输入 Cron 执行表达式" @input="cronValid = null">
                <template #append>
                  <el-button :loading="cronChecking" @click="handleCheckCron">验证</el-button>
                </template>
              </el-input>
              <!-- 验证结果 -->
              <transition name="el-fade-in">
                <div v-if="cronValid !== null" class="cron-result">
                  <template v-if="cronValid">
                    <el-icon color="var(--el-color-success)"><CircleCheck /></el-icon>
                    <span style="color: var(--el-color-success)">Cron 表达式合法</span>
                  </template>
                  <template v-else>
                    <el-icon color="var(--el-color-danger)"><CircleClose /></el-icon>
                    <span style="color: var(--el-color-danger)">Cron 表达式无效，请检查格式</span>
                  </template>
                </div>
              </transition>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="0">正常</el-radio>
                <el-radio value="1">暂停</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Plus, Delete, Edit, Search, Refresh, List, CaretRight, VideoPause, VideoPlay, QuestionFilled, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import {
  listJob, getJob, addJob, updateJob, delJob,
  changeJobStatus, runJob, checkCron,
  type Job
} from '@/api/monitor/job'

const router = useRouter()
const queryFormRef = ref<FormInstance>()
const jobFormRef = ref<FormInstance>()

const loading = ref(false)
const showSearch = ref(true)
const total = ref(0)
const tableData = ref<(Job & { _toggling?: boolean })[]>([])
const selectedIds = ref<number[]>([])
const selectedRows = ref<Job[]>([])

const dialog = reactive({ visible: false, title: '' })

const queryParams = reactive({
  jobName: undefined as string | undefined,
  jobGroup: undefined as string | undefined,
  status: undefined as string | undefined,
  pageNum: 1,
  pageSize: 10,
})

const initForm: Job = {
  jobName: '',
  jobGroup: 'DEFAULT',
  invokeTarget: '',
  cronExpression: '',
  misfirePolicy: '3',
  concurrent: '1',
  status: '0',
  remark: '',
}

const form = reactive<Job>({ ...initForm })

const rules = {
  jobName: [{ required: true, message: '任务名称不能为空', trigger: 'blur' }],
  invokeTarget: [{ required: true, message: '调用目标不能为空', trigger: 'blur' }],
  cronExpression: [{ required: true, message: 'Cron 表达式不能为空', trigger: 'blur' }],
}

const getList = async () => {
  loading.value = true
  try {
    const res = await listJob(queryParams)
    // Backend returns R<List<SysJob>>; res.data is the plain array
    const list: Job[] = Array.isArray(res.data) ? res.data : []
    tableData.value = list.map((r) => ({ ...r, _toggling: false }))
    total.value = list.length
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

const handleSelectionChange = (rows: Job[]) => {
  selectedRows.value = rows
  selectedIds.value = rows.map((r) => r.jobId as number).filter(Boolean)
}

const resetCronValidation = () => {
  cronValid.value = null
}

const cancel = () => {
  Object.assign(form, initForm)
  jobFormRef.value?.resetFields()
  resetCronValidation()
  dialog.visible = false
}

const handleAdd = () => {
  Object.assign(form, initForm)
  jobFormRef.value?.resetFields()
  resetCronValidation()
  dialog.visible = true
  dialog.title = '新增定时任务'
}

const handleUpdate = async (row: Job) => {
  Object.assign(form, initForm)
  jobFormRef.value?.resetFields()
  resetCronValidation()
  const { data } = await getJob(row.jobId as number)
  Object.assign(form, data)
  dialog.visible = true
  dialog.title = '修改定时任务'
}

const submitForm = () => {
  jobFormRef.value?.validate(async (valid) => {
    if (!valid) return
    if (form.jobId) {
      await updateJob(form)
    } else {
      await addJob(form)
    }
    ElMessage.success('操作成功')
    dialog.visible = false
    getList()
  })
}

const handleToggle = async (row: Job & { _toggling?: boolean }, enabled: boolean) => {
  row._toggling = true
  try {
    await changeJobStatus(row.jobId as number, enabled ? '0' : '1')
    row.status = enabled ? '0' : '1'
    ElMessage.success(enabled ? '任务已启用' : '任务已暂停')
  } catch {
    // revert on error — reload from server
    getList()
  } finally {
    row._toggling = false
  }
}

const handleRun = async (row: Job) => {
  await ElMessageBox.confirm(`确定立即执行任务「${row.jobName}」吗？`, '执行确认', { type: 'info' })
  await runJob(row.jobId as number, row.jobGroup)
  ElMessage.success('执行请求已发送')
}

const handleDelete = async (row: Job) => {
  await ElMessageBox.confirm(`确定删除任务「${row.jobName}」吗？`, '删除确认', { type: 'warning' })
  await delJob(row.jobId as number)
  ElMessage.success('删除成功')
  getList()
}

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return
  await ElMessageBox.confirm(
    `确定删除选中的 ${selectedIds.value.length} 个定时任务吗？`,
    '批量删除确认',
    { type: 'warning' }
  )
  await Promise.all(selectedIds.value.map((id) => delJob(id)))
  ElMessage.success('批量删除成功')
  getList()
}

const handleBatchPause = async () => {
  if (!selectedIds.value.length) return
  await ElMessageBox.confirm(`确定暂停选中的 ${selectedIds.value.length} 个任务吗？`, '暂停确认', { type: 'warning' })
  await Promise.all(selectedIds.value.map((id) => changeJobStatus(id, '1')))
  ElMessage.success('已暂停')
  getList()
}

const handleBatchResume = async () => {
  if (!selectedIds.value.length) return
  await ElMessageBox.confirm(`确定恢复选中的 ${selectedIds.value.length} 个任务吗？`, '恢复确认', { type: 'info' })
  await Promise.all(selectedIds.value.map((id) => changeJobStatus(id, '0')))
  ElMessage.success('已恢复')
  getList()
}

// ── Cron 验证 ─────────────────────────────────────────────
const cronChecking = ref(false)
const cronValid = ref<boolean | null>(null)

const handleCheckCron = async () => {
  if (!form.cronExpression?.trim()) {
    ElMessage.warning('请先输入 Cron 表达式')
    return
  }
  cronChecking.value = true
  cronValid.value = null
  try {
    const res = await checkCron(form.cronExpression)
    cronValid.value = res.data === true
  } catch {
    cronValid.value = false
  } finally {
    cronChecking.value = false
  }
}

const toJobLog = () => router.push('/system/monitor/job-log')

const toJobLogWithFilter = (row: Job) =>
  router.push({ path: '/system/monitor/job-log', query: { jobName: row.jobName, jobGroup: row.jobGroup } })

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
.cron-result {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 13px;
}
</style>
