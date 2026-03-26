<template>
  <div class="map-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left toolbar-left-cluster">
        <!-- 漫游 -->
        <el-button-group class="creation-tool-group">
          <el-tooltip
            content="空白处拖移画布；悬停点/线/位置可选中拖动；"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              :type="currentTool === 'pan' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.PAN)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="manyou" class="pan-hand-icon" />
                </span>
                <span class="map-toolbar-btn__label">漫游</span>
              </span>
            </el-button>
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" class="toolbar-cluster-divider" />
        <!-- 地图元素：绘制点、绘制位置、路网连线、虚线链接、规则区域 -->
        <el-button-group class="creation-tool-group">
          <el-tooltip
              content="点击画布添加点位"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              :type="currentTool === 'point' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.POINT)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="diandian" class="point-type-svg-icon" />
                </span>
                <span class="map-toolbar-btn__label">绘制点</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="点击画布创建业务位置（方形区域）"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              :type="currentTool === 'location' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.LOCATION)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <el-icon :size="20"><Location /></el-icon>
                </span>
                <span class="map-toolbar-btn__label">绘制位置</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip content="拖拽连接两点创建直线" :show-after="50" placement="bottom">
            <el-button
              class="map-toolbar-btn toolbar-tool-path toolbar-tool-path-direct"
              :type="
                currentTool === 'path' &&
                mapEditorStore.pathConnectionType === 'direct'
                  ? 'primary'
                  : 'default'
              "
              size="small"
              @click="handlePathToolClick('direct')"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <PathTypeIcon
                    type="direct"
                    :active="
                      currentTool === 'path' &&
                      mapEditorStore.pathConnectionType === 'direct'
                    "
                  />
                </span>
                <span class="map-toolbar-btn__label">直线</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="拖拽连接两点创建直角路径"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn toolbar-tool-path toolbar-tool-path-orthogonal"
              :type="
                currentTool === 'path' &&
                mapEditorStore.pathConnectionType === 'orthogonal'
                  ? 'primary'
                  : 'default'
              "
              size="small"
              @click="handlePathToolClick('orthogonal')"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <PathTypeIcon
                    type="orthogonal"
                    :active="
                      currentTool === 'path' &&
                      mapEditorStore.pathConnectionType === 'orthogonal'
                    "
                  />
                </span>
                <span class="map-toolbar-btn__label">直角连线</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="拖拽连接两点创建贝塞尔曲线"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn toolbar-tool-path toolbar-tool-path-curve"
              :type="
                currentTool === 'path' &&
                mapEditorStore.pathConnectionType === 'curve'
                  ? 'primary'
                  : 'default'
              "
              size="small"
              @click="handlePathToolClick('curve')"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="bezier2" class="path-bezier-icon" />
                </span>
                <span class="map-toolbar-btn__label">贝塞尔</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="在位置中心按下并拖到路网点释放，创建虚线 Link（连接业务位置与拓扑点）"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn toolbar-tool-dashed-link"
              :type="currentTool === 'dashedLink' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.DASHED_LINK)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="dashed-link" class="dashed-link-toolbar-icon" />
                </span>
                <span class="map-toolbar-btn__label">虚线链接</span>
              </span>
            </el-button>
          </el-tooltip>
          <!-- 规则区域 -->
          <el-tooltip
            content="点击画布顶点绘制规则区域"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn toolbar-tool-rule"
              :type="currentTool === 'ruleRegion' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.RULE_REGION)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <svg-icon icon-class="rule-region" style="font-size: 18px" />
                </span>
                <span class="map-toolbar-btn__label">规则区域</span>
              </span>
            </el-button>
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" class="toolbar-cluster-divider" />
        <!-- 撤销 / 重做 -->
        <el-button-group class="creation-tool-group">
          <el-tooltip
            content="撤销 (Ctrl+Z)"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              size="small"
              :disabled="!canUndo"
              @click="undo"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <el-icon :size="20"><RefreshLeft /></el-icon>
                </span>
                <span class="map-toolbar-btn__label">撤销</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="重做 (Ctrl+Shift+Z)"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              size="small"
              :disabled="!canRedo"
              @click="redo"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <el-icon :size="20"><RefreshRight /></el-icon>
                </span>
                <span class="map-toolbar-btn__label">重做</span>
              </span>
            </el-button>
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" class="toolbar-cluster-divider" />
        <!-- 标签 / Block -->
        <el-button-group class="creation-tool-group">
          <el-tooltip
            content="显示/隐藏标签"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              :type="showLabels ? 'primary' : 'default'"
              size="small"
              @click="toggleLabels"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <el-icon :size="20"><PriceTag /></el-icon>
                </span>
                <span class="map-toolbar-btn__label">标签</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="显示/隐藏Block"
            :show-after="50"
            placement="bottom"
          >
            <el-button
              class="map-toolbar-btn"
              :type="showBlocks ? 'primary' : 'default'"
              size="small"
              @click="toggleBlocks"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <el-icon :size="20"><Box /></el-icon>
                </span>
                <span class="map-toolbar-btn__label">Block</span>
              </span>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button
          v-if="mapEditorStore.mapData?.mapInfo?.status !== '1'"
          type="success"
          size="small"
          icon="Check"
          @click="handlePublish"
          :loading="publishLoading"
        >
          发布
        </el-button>
        <el-button
          type="primary"
          size="small"
          icon="Document"
          @click="handleSave"
          :loading="loading"
          >保存</el-button
        >
        <el-button size="small" icon="Close" @click="handleClose"
          >关闭</el-button
        >
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧面板：视图、属性 -->
      <div class="left-panels" :style="{ width: leftPanelWidth + 'px' }">
        <!-- 视图面板 -->
        <div class="panel-container view-panel-container">
          <div class="panel-header">
            <span class="canval-title">视图</span>
          </div>
          <div class="panel-content">
            <ComponentsPanel />
          </div>
        </div>

        <!-- 属性面板顶部拖拽条 -->
        <div
          v-show="!isPropertyPanelCollapsed"
          class="panel-horizontal-resizer"
          @mousedown="handlePanelResizeStart('property', $event)"
        ></div>

        <!-- 属性面板 -->
        <div class="panel-container property-panel-container">
          <div class="panel-header" @click="togglePropertyPanelCollapse">
            <span class="canvas-title">属性</span>
            <el-icon
              class="collapse-icon"
              :class="{ collapsed: isPropertyPanelCollapsed }"
            >
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="!isPropertyPanelCollapsed" class="panel-content">
            <PropertyPanel />
          </div>
        </div>

        <!-- 图层面板顶部拖拽条 -->
        <div
          v-show="!isLayerPanelCollapsed"
          class="panel-horizontal-resizer"
          @mousedown="handlePanelResizeStart('layer', $event)"
        ></div>

        <!-- 图层面板 -->
        <div class="panel-container layer-panel-container">
          <div class="panel-header" @click="toggleLayerPanelCollapse">
            <span class="canvas-title">图层</span>
            <el-icon
              class="collapse-icon"
              :class="{ collapsed: isLayerPanelCollapsed }"
            >
              <ArrowDown />
            </el-icon>
          </div>
          <div v-show="!isLayerPanelCollapsed" class="panel-content">
            <LayerPanel />
          </div>
        </div>
      </div>

      <!-- 左侧可拖拽的分隔条 -->
      <div
        class="panel-resizer"
        @mousedown="handleResizeStart"
        :class="{ resizing: isResizing }"
      ></div>

      <!-- 中间：画布区域 -->
      <div class="canvas-area">
        <div class="canvas-wrapper">
          <MapCanvas
            ref="mapCanvasRef"
            @point-double-click="handlePointDoubleClick"
          />
        </div>
        <!-- 坐标轴已移至 MapCanvas，与 Stage offset 同步，随漫游移动 -->
        <!-- 底部信息 -->
        <div class="canvas-footer">
          <span class="mode-info">编辑模式</span>
          <span class="footer-sep">·</span>
          <span class="muted">地图ID：</span>
          <span class="mono">{{ mapId || "-" }}</span>
          <span class="footer-sep">·</span>
          <el-tag
            :type="mapEditorStore.mapData?.mapInfo?.status === '1' ? 'success' : 'warning'"
            size="small"
            class="version-tag"
          >
            v{{ mapEditorStore.mapData?.mapInfo?.mapVersion || '1.0' }}
          </el-tag>
          <span class="footer-sep">·</span>
          <span class="muted">缩放：</span>
          <span class="zoom-percent" @click="resetZoom">{{ zoomPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- 导入栅格地图对话框（选择 map.yaml + map.pgm） -->
    <el-dialog
      v-model="importRasterDialogVisible"
      title="导入栅格地图"
      width="480"
      destroy-on-close
      @close="resetImportRasterState"
    >
      <div class="import-raster-form">
        <div class="import-raster-row">
          <span class="label">map.yaml</span>
          <el-button size="small" @click="triggerYamlSelect"
            >选择 YAML 文件</el-button
          >
          <input
            ref="yamlInputRef"
            type="file"
            accept=".yaml,.yml"
            style="display: none"
            @change="onYamlFileChange"
          />
          <span class="file-name">{{ rasterYamlFileName || "未选择" }}</span>
        </div>
        <div class="import-raster-row">
          <span class="label">map.pgm</span>
          <el-button size="small" @click="triggerPgmSelect"
            >选择栅格图像 (PGM)</el-button
          >
          <input
            ref="pgmInputRef"
            type="file"
            accept=".pgm"
            style="display: none"
            @change="onPgmFileChange"
          />
          <span class="file-name">{{ rasterPgmFileName || "未选择" }}</span>
        </div>
        <div v-if="rasterParsedInfo" class="import-raster-info">
          <div>分辨率: {{ rasterParsedInfo.resolution }} m/像素</div>
          <div>
            原点: ({{ rasterParsedInfo.originX }},
            {{ rasterParsedInfo.originY }}) m
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importRasterDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!rasterYamlFile || !rasterPgmFile"
          :loading="importRasterLoading"
          @click="confirmImportRaster"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入点位 CSV 对话框 -->
    <el-dialog
      v-model="importCsvDialogVisible"
      title="批量导入点位 (CSV)"
      width="700"
      destroy-on-close
    >
      <div class="import-csv-form">
        <div class="import-csv-instructions">
          <p>请上传 CSV 文件，文件格式如下：</p>
          <div class="csv-format">
            <code>name,code,x,y,type,description</code>
          </div>
          <ul class="format-notes">
            <li><strong>name</strong>: 点位名称（必填）</li>
            <li><strong>code</strong>: 点位编码（可选）</li>
            <li><strong>x</strong>: X坐标（必填，单位：像素）</li>
            <li><strong>y</strong>: Y坐标（必填，单位：像素）</li>
            <li><strong>type</strong>: 点位类型（可选，默认Halt point）</li>
            <li><strong>description</strong>: 描述（可选）</li>
          </ul>
          <p class="type-hint">
            类型可选值: Halt point, Park point, Station, Charge point
          </p>
        </div>
        <div class="import-csv-upload">
          <el-button size="small" @click="triggerCsvSelect"
            >选择 CSV 文件</el-button
          >
          <input
            ref="csvInputRef"
            type="file"
            accept=".csv"
            style="display: none"
            @change="onCsvFileChange"
          />
          <span class="file-name">{{ csvFileName || "未选择" }}</span>
        </div>
        <div v-if="csvParsedData.length > 0" class="import-csv-preview">
          <div class="preview-header">
            <span>预览 (共 {{ csvParsedData.length }} 条记录)</span>
            <el-button size="small" type="danger" text @click="clearCsvData"
              >清除</el-button
            >
          </div>
          <el-table :data="csvParsedData" height="250" size="small" stripe>
            <el-table-column
              prop="name"
              label="名称"
              width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="code"
              label="编码"
              width="100"
              show-overflow-tooltip
            />
            <el-table-column prop="x" label="X坐标" width="80" align="center" />
            <el-table-column prop="y" label="Y坐标" width="80" align="center" />
            <el-table-column
              prop="type"
              label="类型"
              width="100"
              show-overflow-tooltip
            />
            <el-table-column
              prop="description"
              label="描述"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.error" type="danger" size="small"
                  >错误</el-tag
                >
                <el-tag v-else type="success" size="small">有效</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="csvErrorCount > 0" class="csv-error-summary">
            <el-alert type="error" :closable="false" show-icon>
              存在 {{ csvErrorCount }} 条无效数据，将跳过这些记录
            </el-alert>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importCsvDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="csvValidCount === 0"
          @click="confirmImportCsv"
        >
          导入 {{ csvValidCount }} 个点位
        </el-button>
      </template>
    </el-dialog>

    <!-- 栅格底图坐标校准对话框 -->
    <el-dialog
      v-model="rasterCalibrateDialogVisible"
      title="栅格坐标校准"
      width="450"
      destroy-on-close
    >
      <div class="raster-calibrate-form">
        <div class="calibrate-info">
          <p>当前栅格底图参数：</p>
          <div class="info-row">
            <span class="label">分辨率:</span>
            <span
              >{{ rasterBackgroundInfo?.resolution?.toFixed(4) }} m/像素</span
            >
          </div>
          <div class="info-row">
            <span class="label">图像尺寸:</span>
            <span
              >{{ rasterBackgroundInfo?.widthPx }} ×
              {{ rasterBackgroundInfo?.heightPx }} 像素</span
            >
          </div>
        </div>
        <el-divider content-position="left">坐标偏移</el-divider>
        <el-form label-width="80px" size="default">
          <el-form-item label="原点 X">
            <el-input-number
              v-model="rasterCalibrateForm.originX"
              :step="0.1"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
            <div class="form-tip">
              栅格图像左下角在地图中的 X 坐标（单位：米）
            </div>
          </el-form-item>
          <el-form-item label="原点 Y">
            <el-input-number
              v-model="rasterCalibrateForm.originY"
              :step="0.1"
              :precision="2"
              controls-position="right"
              style="width: 100%"
            />
            <div class="form-tip">
              栅格图像左下角在地图中的 Y 坐标（单位：米）
            </div>
          </el-form-item>
          <el-form-item label="分辨率">
            <el-input-number
              v-model="rasterCalibrateForm.resolution"
              :step="0.001"
              :min="0.0001"
              :precision="4"
              controls-position="right"
              style="width: 100%"
            />
            <div class="form-tip">米/像素，修改需谨慎</div>
          </el-form-item>
        </el-form>
        <el-divider content-position="left">快速定位</el-divider>
        <div class="quick-actions">
          <el-button size="small" @click="resetRasterOrigin"
            >重置到原点 (0, 0)</el-button
          >
          <el-button size="small" @click="centerRasterInView"
            >居中显示</el-button
          >
        </div>
      </div>
      <template #footer>
        <el-button @click="rasterCalibrateDialogVisible = false"
          >取消</el-button
        >
        <el-button type="primary" @click="applyRasterCalibration"
          >应用</el-button
        >
      </template>
    </el-dialog>

    <!-- 版本历史对话框 -->
    <el-dialog
      v-model="versionHistoryDialogVisible"
      title="版本历史"
      width="600"
      destroy-on-close
    >
      <div class="version-history">
        <div class="version-actions">
          <el-button size="small" type="primary" @click="createVersionSnapshot"
            >创建快照</el-button
          >
          <el-button size="small" @click="refreshVersionList">刷新</el-button>
          <el-button size="small" @click="openVersionCompareDialog"
            >版本对比</el-button
          >
        </div>
        <el-table :data="versionHistoryList" height="350" size="small" stripe>
          <el-table-column
            prop="description"
            label="描述"
            min-width="120"
            show-overflow-tooltip
          />
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatVersionTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="pointCount"
            label="点数"
            width="60"
            align="center"
          />
          <el-table-column
            prop="pathCount"
            label="路径"
            width="60"
            align="center"
          />
          <el-table-column
            prop="locationCount"
            label="位置"
            width="60"
            align="center"
          />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                link
                @click="restoreVersion(row.id)"
                >恢复</el-button
              >
              <el-popconfirm
                title="确定删除此版本?"
                @confirm="deleteVersion(row.id)"
              >
                <template #reference>
                  <el-button type="danger" size="small" link>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div class="version-tip">
          <el-alert type="info" :closable="false" show-icon>
            最多保存 {{ maxVersionCount }} 个版本，恢复操作会自动保存当前状态
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button @click="versionHistoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 版本对比对话框 -->
    <el-dialog
      v-model="versionCompareDialogVisible"
      title="版本对比"
      width="900"
      destroy-on-close
    >
      <div class="version-compare">
        <div class="compare-selector">
          <div class="selector-item">
            <span class="label">基准版本：</span>
            <el-select
              v-model="compareVersionA"
              placeholder="选择版本"
              size="small"
              style="width: 200px"
            >
              <el-option
                v-for="v in versionHistoryList"
                :key="v.id"
                :label="`${v.description} (${formatVersionTime(v.timestamp)})`"
                :value="v.id"
              />
            </el-select>
          </div>
          <div class="selector-item">
            <span class="label">对比版本：</span>
            <el-select
              v-model="compareVersionB"
              placeholder="选择版本"
              size="small"
              style="width: 200px"
            >
              <el-option
                v-for="v in versionHistoryList"
                :key="v.id"
                :label="`${v.description} (${formatVersionTime(v.timestamp)})`"
                :value="v.id"
              />
            </el-select>
          </div>
          <el-button
            type="primary"
            size="small"
            :disabled="!compareVersionA || !compareVersionB"
            @click="runVersionCompare"
            >对比</el-button
          >
        </div>

        <div v-if="compareResult" class="compare-result">
          <el-tabs v-model="compareActiveTab">
            <el-tab-pane label="点位变更" name="points">
              <div class="change-summary">
                <el-tag type="success" size="small"
                  >新增 {{ compareResult.points.added.length }}</el-tag
                >
                <el-tag type="danger" size="small"
                  >删除 {{ compareResult.points.removed.length }}</el-tag
                >
                <el-tag type="warning" size="small"
                  >修改 {{ compareResult.points.modified.length }}</el-tag
                >
              </div>
              <el-table
                :data="compareResult.points.all"
                height="250"
                size="small"
                stripe
              >
                <el-table-column
                  prop="changeType"
                  label="变更"
                  width="70"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag
                      v-if="row.changeType === 'added'"
                      type="success"
                      size="small"
                      >新增</el-tag
                    >
                    <el-tag
                      v-else-if="row.changeType === 'removed'"
                      type="danger"
                      size="small"
                      >删除</el-tag
                    >
                    <el-tag v-else type="warning" size="small">修改</el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="name"
                  label="名称"
                  width="120"
                  show-overflow-tooltip
                />
                <el-table-column prop="x" label="X" width="70" align="center" />
                <el-table-column prop="y" label="Y" width="70" align="center" />
                <el-table-column
                  prop="type"
                  label="类型"
                  width="100"
                  show-overflow-tooltip
                />
                <el-table-column label="变更详情" min-width="200">
                  <template #default="{ row }">
                    <span
                      v-if="row.changeType === 'modified'"
                      class="change-detail"
                    >
                      <template v-for="(val, key) in row.changes" :key="key">
                        {{ key }}: {{ val.from }} → {{ val.to }};
                      </template>
                    </span>
                    <span v-else class="change-detail">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="路径变更" name="paths">
              <div class="change-summary">
                <el-tag type="success" size="small"
                  >新增 {{ compareResult.paths.added.length }}</el-tag
                >
                <el-tag type="danger" size="small"
                  >删除 {{ compareResult.paths.removed.length }}</el-tag
                >
                <el-tag type="warning" size="small"
                  >修改 {{ compareResult.paths.modified.length }}</el-tag
                >
              </div>
              <el-table
                :data="compareResult.paths.all"
                height="250"
                size="small"
                stripe
              >
                <el-table-column
                  prop="changeType"
                  label="变更"
                  width="70"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag
                      v-if="row.changeType === 'added'"
                      type="success"
                      size="small"
                      >新增</el-tag
                    >
                    <el-tag
                      v-else-if="row.changeType === 'removed'"
                      type="danger"
                      size="small"
                      >删除</el-tag
                    >
                    <el-tag v-else type="warning" size="small">修改</el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="name"
                  label="名称"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column label="变更详情" min-width="200">
                  <template #default="{ row }">
                    <span
                      v-if="row.changeType === 'modified'"
                      class="change-detail"
                    >
                      <template v-for="(val, key) in row.changes" :key="key">
                        {{ key }}: {{ val.from }} → {{ val.to }};
                      </template>
                    </span>
                    <span v-else class="change-detail">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="位置变更" name="locations">
              <div class="change-summary">
                <el-tag type="success" size="small"
                  >新增 {{ compareResult.locations.added.length }}</el-tag
                >
                <el-tag type="danger" size="small"
                  >删除 {{ compareResult.locations.removed.length }}</el-tag
                >
                <el-tag type="warning" size="small"
                  >修改 {{ compareResult.locations.modified.length }}</el-tag
                >
              </div>
              <el-table
                :data="compareResult.locations.all"
                height="250"
                size="small"
                stripe
              >
                <el-table-column
                  prop="changeType"
                  label="变更"
                  width="70"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-tag
                      v-if="row.changeType === 'added'"
                      type="success"
                      size="small"
                      >新增</el-tag
                    >
                    <el-tag
                      v-else-if="row.changeType === 'removed'"
                      type="danger"
                      size="small"
                      >删除</el-tag
                    >
                    <el-tag v-else type="warning" size="small">修改</el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="name"
                  label="名称"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column label="变更详情" min-width="200">
                  <template #default="{ row }">
                    <span
                      v-if="row.changeType === 'modified'"
                      class="change-detail"
                    >
                      <template v-for="(val, key) in row.changes" :key="key">
                        {{ key }}: {{ val.from }} → {{ val.to }};
                      </template>
                    </span>
                    <span v-else class="change-detail">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div v-else class="compare-empty">
          <el-empty description="请选择两个版本进行对比" :image-size="80" />
        </div>
      </div>
      <template #footer>
        <el-button @click="versionCompareDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 点编辑对话框 -->
    <PointEditDialog
      v-model="showPointEditDialog"
      :point="currentEditPoint"
      @updated="handlePointUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  defineProps,
  defineEmits,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import MapCanvas from "./components/MapCanvas.vue";
import LayerPanel from "./components/LayerPanel.vue";
import ComponentsPanel from "./components/ComponentsPanel.vue";
import PropertyPanel from "./components/PropertyPanel.vue";
import PointEditDialog from "./components/PointEditDialog.vue";
import { useMapEditorStore } from "@/store/modules/mapEditor";
import { useMapEditorTabsStore } from "@/store/modules/mapEditorTabs";
import { ToolMode, LayerType } from "@/types/mapEditor";
import type { MapPoint } from "@/types/mapEditor";
import { DEFAULT_POINT_OUTER_RADIUS } from "@/utils/mapEditor/mapVisualTokens";
import PathTypeIcon from "./components/icons/PathTypeIcon.vue";
import SvgIcon from "@/components/SvgIcon/index.vue";
import { exportMapFile, importMapFile, publishMap } from "@/api/opentcs/map";
import { updateNavigationMap } from "@/api/opentcs/factory/map";
import {
  Document,
  Close,
  RefreshLeft,
  RefreshRight,
  Delete,
  ZoomIn,
  ZoomOut,
  FullScreen,
  Picture,
  Location,
  Clock,
  PriceTag,
  Box,
} from "@element-plus/icons-vue";
import { parsePgmToDataUrl } from "@/utils/mapEditor/pgmParser";
import type { RasterBackground } from "@/types/mapEditor";
import request from "@/utils/request";

// Props
const props = defineProps<{
  mapId?: string;
  mapName?: string;
}>();

// Emits
const emit = defineEmits<{
  (e: "map-updated", mapName: string): void;
  (e: "close"): void;
}>();

const route = useRoute();
const router = useRouter();
const mapEditorStore = useMapEditorStore();
const mapEditorTabsStore = useMapEditorTabsStore();
const mapCanvasRef = ref<InstanceType<typeof MapCanvas>>();

// 网格显示状态

// 标签显示状态
const showLabels = ref(true);

// Block显示状态
const showBlocks = ref(true);

// 鼠标位置（从画布组件获取）
const mousePosition = ref({ x: 0, y: 0 });

// 点编辑对话框
const showPointEditDialog = ref(false);
const currentEditPoint = ref<MapPoint | null>(null);

// 导入栅格地图
const importRasterDialogVisible = ref(false);
const yamlInputRef = ref<HTMLInputElement | null>(null);
const pgmInputRef = ref<HTMLInputElement | null>(null);
const rasterYamlFile = ref<File | null>(null);
const rasterPgmFile = ref<File | null>(null);
const rasterYamlFileName = ref("");
const rasterPgmFileName = ref("");
const rasterParsedInfo = ref<{
  resolution: number;
  originX: number;
  originY: number;
} | null>(null);
const importRasterLoading = ref(false);

// 栅格坐标校准
const rasterCalibrateDialogVisible = ref(false);
const rasterCalibrateForm = reactive({
  originX: 0,
  originY: 0,
  resolution: 0.05,
});
const rasterBackgroundInfo = computed(() => mapEditorStore.rasterBackground);

// 版本历史
const versionHistoryDialogVisible = ref(false);
const versionHistoryList = ref<
  {
    id: string;
    timestamp: number;
    description: string;
    pointCount: number;
    pathCount: number;
    locationCount: number;
  }[]
>([]);
const maxVersionCount = 20;

// 版本对比
const versionCompareDialogVisible = ref(false);
const compareVersionA = ref<string>("");
const compareVersionB = ref<string>("");
const compareActiveTab = ref("points");
const compareResult = ref<{
  points: { added: any[]; removed: any[]; modified: any[]; all: any[] };
  paths: { added: any[]; removed: any[]; modified: any[]; all: any[] };
  locations: { added: any[]; removed: any[]; modified: any[]; all: any[] };
} | null>(null);

// CSV 导入相关计算属性
const csvValidCount = computed(
  () => csvParsedData.value.filter((d) => !d.error).length,
);
const csvErrorCount = computed(
  () => csvParsedData.value.filter((d) => d.error).length,
);

// 批量导入点位 CSV
const importCsvDialogVisible = ref(false);
const csvInputRef = ref<HTMLInputElement | null>(null);
const csvFileName = ref("");
const csvParsedData = ref<
  {
    name: string;
    code?: string;
    x: number;
    y: number;
    type: string;
    description?: string;
    error?: string;
  }[]
>([]);

// 图层面板折叠状态（默认收起）
const isLayerPanelCollapsed = ref(true);

// 属性面板折叠状态（默认展开）
const isPropertyPanelCollapsed = ref(false);

// 面板折叠状态与高度（支持记忆）
const PROPERTY_PANEL_HEIGHT_KEY = "map-editor-property-panel-height";
const LAYER_PANEL_HEIGHT_KEY = "map-editor-layer-panel-height";
const PROPERTY_PANEL_COLLAPSED_KEY = "map-editor-property-panel-collapsed";
const LAYER_PANEL_COLLAPSED_KEY = "map-editor-layer-panel-collapsed";
const DEFAULT_LAYER_PANEL_HEIGHT = 200; // 图层面板默认展开高度，避免占满左侧
const propertyPanelHeight = ref<number | null>(null);
const layerPanelHeight = ref<number | null>(null);

// 仿真与地图检测相关状态（已下线仿真与检测功能，保留接口方便后续扩展）
const isSimulating = ref(false);
const simulationPathId = ref<string | null>(null);
const simulationProgress = ref(0);
const simulationSpeed = ref(1);
const mapIssues = ref<any[]>([]);

// 是否有路径被选中
const hasPathSelected = computed(() => {
  const selectedType = mapEditorStore.selection.selectedType;
  const selectedIds = mapEditorStore.selection.selectedIds;
  return selectedType === "path" && selectedIds.size > 0;
});

// 仿真控制
const toggleSimulation = () => {
  if (isSimulating.value) {
    // 停止仿真
    isSimulating.value = false;
    simulationPathId.value = null;
    simulationProgress.value = 0;
  } else {
    // 开始仿真
    const selectedIds = Array.from(mapEditorStore.selection.selectedIds);
    if (selectedIds.length > 0) {
      simulationPathId.value = selectedIds[0];
      isSimulating.value = true;
      simulationProgress.value = 0;
      startSimulation();
    }
  }
};

// 开始仿真动画
let simulationTimer: ReturnType<typeof setInterval> | null = null;
const startSimulation = () => {
  if (simulationTimer) {
    clearInterval(simulationTimer);
  }
  const baseInterval = 50; // 基础间隔
  simulationTimer = setInterval(() => {
    if (simulationProgress.value >= 100) {
      simulationProgress.value = 0;
    } else {
      // 根据速度调整增量
      simulationProgress.value += 2 * simulationSpeed.value;
    }
  }, baseInterval);
};

// 运行地图验证检测
const runMapValidation = () => {
  const issues: MapIssue[] = [];
  const points = mapEditorStore.points;
  const paths = mapEditorStore.paths;
  const locations = mapEditorStore.locations;

  // 1. 断连检测 - 找出未连接到任何路径的点
  const connectedPointIds = new Set<string>();
  paths.forEach((path) => {
    if (path.startPointId) connectedPointIds.add(String(path.startPointId));
    if (path.endPointId) connectedPointIds.add(String(path.endPointId));
  });
  points.forEach((point) => {
    if (!connectedPointIds.has(point.id)) {
      issues.push({
        id: `disconnected-${point.id}`,
        type: "disconnected",
        severity: "warning",
        message: `点位 "${point.name}" 未连接到任何路径`,
        elementIds: [point.id],
        position: { x: point.x, y: point.y },
      });
    }
  });

  // 2. 路径交叉检测 - 简单的线段交叉检测
  const pathSegments: { id: string; points: { x: number; y: number }[] }[] = [];
  paths.forEach((path) => {
    if (
      path.geometry.controlPoints &&
      path.geometry.controlPoints.length >= 2
    ) {
      pathSegments.push({
        id: path.id,
        points: path.geometry.controlPoints,
      });
    }
  });

  // 检查路径是否形成回路
  for (let i = 0; i < paths.length; i++) {
    const path1 = paths[i];
    if (
      !path1.geometry.controlPoints ||
      path1.geometry.controlPoints.length < 2
    )
      continue;

    const start1 = path1.geometry.controlPoints[0];
    const end1 =
      path1.geometry.controlPoints[path1.geometry.controlPoints.length - 1];

    // 检查是否形成孤立回路（起点和终点相连但中间没有其他连接）
    if (String(start1.id) === String(path1.endPointId) && paths.length > 1) {
      issues.push({
        id: `loop-${path1.id}`,
        type: "intersection",
        severity: "warning",
        message: `路径 "${path1.name}" 形成孤立回路`,
        elementIds: [path1.id],
      });
    }
  }

  // 3. 转弯半径检测 - 检测路径拐角是否过急
  paths.forEach((path) => {
    if (
      path.geometry.controlPoints &&
      path.geometry.controlPoints.length >= 3
    ) {
      for (let i = 1; i < path.geometry.controlPoints.length - 1; i++) {
        const prev = path.geometry.controlPoints[i - 1];
        const curr = path.geometry.controlPoints[i];
        const next = path.geometry.controlPoints[i + 1];

        // 计算转弯角度
        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let angleDiff = (Math.abs(angle1 - angle2) * 180) / Math.PI;
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // 如果转弯角度大于90度，给出警告
        if (angleDiff > 90) {
          issues.push({
            id: `radius-${path.id}-${i}`,
            type: "radius",
            severity: "warning",
            message: `路径 "${path.name}" 转弯角度过大 (${angleDiff.toFixed(1)}°)`,
            elementIds: [path.id],
            position: { x: curr.x, y: curr.y },
          });
        }
      }
    }
  });

  // 4. 位置区域重叠检测
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];

      // 简单的重心距离检测
      const centroid1 = getLocationCentroid(loc1);
      const centroid2 = getLocationCentroid(loc2);
      const distance = Math.hypot(
        centroid1.x - centroid2.x,
        centroid1.y - centroid2.y,
      );

      // 假设位置区域大小为40px，如果距离小于40则认为重叠
      if (distance < 40) {
        issues.push({
          id: `overlap-${loc1.id}-${loc2.id}`,
          type: "overlap",
          severity: "error",
          message: `位置区域 "${loc1.name}" 与 "${loc2.name}" 重叠`,
          elementIds: [loc1.id, loc2.id],
          position: {
            x: (centroid1.x + centroid2.x) / 2,
            y: (centroid1.y + centroid2.y) / 2,
          },
        });
      }
    }
  }

  mapIssues.value = issues;

  if (issues.length === 0) {
    ElMessage.success("地图检测通过，未发现问题");
  } else {
    ElMessage.warning(`检测到 ${issues.length} 个问题`);
  }
};

// 辅助函数：获取位置中心点
const getLocationCentroid = (location: any) => {
  const vertices = location.geometry?.vertices || [];
  if (vertices.length === 0) {
    return { x: location.x || 0, y: location.y || 0 };
  }
  let x = 0,
    y = 0;
  vertices.forEach((v: any) => {
    x += v.x;
    y += v.y;
  });
  return { x: x / vertices.length, y: y / vertices.length };
};

// 左侧面板宽度
const LEFT_PANEL_MIN_WIDTH = 200;
const LEFT_PANEL_MAX_WIDTH = 600;
const LEFT_PANEL_DEFAULT_WIDTH = 280;
const LEFT_PANEL_WIDTH_KEY = "map-editor-left-panel-width";

const leftPanelWidth = ref(LEFT_PANEL_DEFAULT_WIDTH);
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

// 从 store 获取状态
const currentTool = computed(() => mapEditorStore.currentTool);
const canUndo = computed(() => mapEditorStore.canUndo);
const canRedo = computed(() => mapEditorStore.canRedo);
const loading = computed(() => mapEditorStore.loading);
const isDirty = computed(() => mapEditorStore.isDirty);
const canvasState = computed(() => mapEditorStore.canvasState);

// 比例尺（mm/单位），用于状态栏换算与 openTCS 一致
const scaleX = computed(() => {
  const v =
    mapEditorStore.mapData?.mapInfo?.scaleX ??
    mapEditorStore.mapData?.visualLayout?.scaleX;
  return typeof v === "number" ? v : v != null ? parseFloat(String(v)) : null;
});
const scaleY = computed(() => {
  const v =
    mapEditorStore.mapData?.mapInfo?.scaleY ??
    mapEditorStore.mapData?.visualLayout?.scaleY;
  return typeof v === "number" ? v : v != null ? parseFloat(String(v)) : null;
});

// 画布缩放比例
const canvasScale = computed(() => {
  return mapEditorStore.canvasState?.scale ?? 1;
});

// 缩放百分比（以初始 origin 展示 scale 为基准，确保初始时为 100%）
const zoomPercent = computed(() => {
  const base = mapEditorStore.mapData?.mapInfo?.scale ?? 1;
  const baseScale = typeof base === 'number' ? base : base != null ? parseFloat(String(base)) : 1;
  const denom = Number.isFinite(baseScale) && baseScale !== 0 ? baseScale : 1;
  return Math.round((canvasScale.value / denom) * 100);
});

// 模型坐标 → 实际长度显示（单位 mm，≥1000 时显示为 m）
const formatModelLength = (
  modelUnits: number,
  scaleMmPerUnit: number,
): string => {
  const mm = modelUnits * scaleMmPerUnit;
  if (Math.abs(mm) >= 1000) return `${(mm / 1000).toFixed(2)} m`;
  return `${mm.toFixed(1)} mm`;
};

const hasSelection = computed(() => {
  const { selectedIds, selectedType } = mapEditorStore.selection;
  return selectedIds.size > 0 && selectedType !== "layout";
});

type PathConnectionType = "direct" | "orthogonal" | "curve";

// 工具切换（不弹 Toast，工具栏已有图标+文字状态）
const setTool = (tool: ToolMode) => {
  mapEditorStore.setTool(tool);
};

const getPointTypeIconClass = (type: string) => {
  return type === "Park point" ? "park-point" : "halt-point";
};

// 获取点位类型标签
const getPointTypeLabel = (type: string) => {
  const labelMap: Record<string, string> = {
    "Halt point": "临时停车",
    "Park point": "长时间停车",
  };
  return labelMap[type] || "临时停车";
};

// 点位类型切换
const handlePointTypeChange = (type: string) => {
  mapEditorStore.setPointType(type);
};

// 连线工具点击：同时切换工具和连线类型
const handlePathToolClick = (type: PathConnectionType) => {
  mapEditorStore.setPathConnectionType(type);
  setTool(ToolMode.PATH);
};

// 点位类型下拉菜单显示状态
const handlePointDropdownVisible = (visible: boolean) => {
  // 如果下拉菜单打开，确保工具已切换到绘制点
  if (visible && currentTool.value !== ToolMode.POINT) {
    setTool(ToolMode.POINT);
  }
};

// 图层面板折叠/展开（带状态记忆）
const toggleLayerPanelCollapse = () => {
  isLayerPanelCollapsed.value = !isLayerPanelCollapsed.value;
  localStorage.setItem(
    LAYER_PANEL_COLLAPSED_KEY,
    isLayerPanelCollapsed.value ? "1" : "0",
  );

  nextTick(() => {
    const layerEl = document.querySelector(
      ".left-panels .layer-panel-container",
    ) as HTMLElement | null;
    if (!layerEl) return;
    // 收起时让高度回到 header 自身高度，展开时恢复为记忆高度或默认高度
    if (isLayerPanelCollapsed.value) {
      layerEl.style.height = "";
    } else {
      const h = layerPanelHeight.value ?? DEFAULT_LAYER_PANEL_HEIGHT;
      layerEl.style.height = `${h}px`;
    }
  });
};

// 属性面板折叠/展开（带状态记忆）
const togglePropertyPanelCollapse = () => {
  isPropertyPanelCollapsed.value = !isPropertyPanelCollapsed.value;
  localStorage.setItem(
    PROPERTY_PANEL_COLLAPSED_KEY,
    isPropertyPanelCollapsed.value ? "1" : "0",
  );

  nextTick(() => {
    const propertyEl = document.querySelector(
      ".left-panels .property-panel-container",
    ) as HTMLElement | null;
    if (!propertyEl) return;
    // 收起时让高度回到 header 自身高度，展开时恢复为记忆高度
    if (isPropertyPanelCollapsed.value) {
      propertyEl.style.height = "";
    } else if (propertyPanelHeight.value !== null) {
      propertyEl.style.height = `${propertyPanelHeight.value}px`;
    }
  });
};

// 单个面板高度拖拽
const isVerticalResizing = ref(false);
const verticalResizeStartY = ref(0);
const verticalResizeTarget = ref<"property" | "layer" | null>(null);
const startPanelHeight = ref(0);

const handlePanelResizeStart = (
  target: "property" | "layer",
  e: MouseEvent,
) => {
  // 未展开时不允许拖动
  if (target === "property" && isPropertyPanelCollapsed.value) return;
  if (target === "layer" && isLayerPanelCollapsed.value) return;

  const selector =
    target === "property"
      ? ".left-panels .property-panel-container"
      : ".left-panels .layer-panel-container";
  const panelEl = document.querySelector(selector) as HTMLElement | null;
  if (!panelEl) return;

  isVerticalResizing.value = true;
  verticalResizeTarget.value = target;
  verticalResizeStartY.value = e.clientY;
  startPanelHeight.value = panelEl.getBoundingClientRect().height;

  document.addEventListener("mousemove", handlePanelResizeMove);
  document.addEventListener("mouseup", handlePanelResizeEnd);
  document.body.style.cursor = "row-resize";
  document.body.style.userSelect = "none";

  e.preventDefault();
};

const handlePanelResizeMove = (e: MouseEvent) => {
  if (!isVerticalResizing.value || !verticalResizeTarget.value) return;

  const selector =
    verticalResizeTarget.value === "property"
      ? ".left-panels .property-panel-container"
      : ".left-panels .layer-panel-container";
  const panelEl = document.querySelector(selector) as HTMLElement | null;
  if (!panelEl) return;

  const minHeight = 80;
  const deltaY = e.clientY - verticalResizeStartY.value;
  // 鼠标向上拖动时面板变大，向下拖动时面板变小
  let newHeight = startPanelHeight.value - deltaY;
  if (newHeight < minHeight) newHeight = minHeight;

  panelEl.style.height = `${newHeight}px`;

  if (verticalResizeTarget.value === "property") {
    propertyPanelHeight.value = newHeight;
  } else {
    layerPanelHeight.value = newHeight;
  }
};

const handlePanelResizeEnd = () => {
  if (!isVerticalResizing.value) return;

  isVerticalResizing.value = false;
  verticalResizeTarget.value = null;
  document.removeEventListener("mousemove", handlePanelResizeMove);
  document.removeEventListener("mouseup", handlePanelResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  if (propertyPanelHeight.value !== null) {
    localStorage.setItem(
      PROPERTY_PANEL_HEIGHT_KEY,
      propertyPanelHeight.value.toString(),
    );
  }
  if (layerPanelHeight.value !== null) {
    localStorage.setItem(
      LAYER_PANEL_HEIGHT_KEY,
      layerPanelHeight.value.toString(),
    );
  }
};

// 撤销/重做
const undo = () => {
  mapEditorStore.undo();
};

const redo = () => {
  mapEditorStore.redo();
};

// 缩放控制
const zoomIn = () => {
  const currentScale = mapEditorStore.canvasState.scale;
  mapEditorStore.updateCanvasState({
    scale: Math.min(currentScale * 1.2, 10),
  });
};

const zoomOut = () => {
  const currentScale = mapEditorStore.canvasState.scale;
  mapEditorStore.updateCanvasState({
    scale: Math.max(currentScale / 1.2, 0.1),
  });
};

const resetZoom = () => {
  mapEditorStore.updateCanvasState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
};

// 切换网格显示
// 切换标签显示
const toggleLabels = () => {
  showLabels.value = !showLabels.value;
  // 更新所有元素的标签可见性
  if (mapCanvasRef.value) {
    (mapCanvasRef.value as any).setLabelsVisible?.(showLabels.value);
  }
  // 更新store中所有元素的labelVisible
  mapEditorStore.points.forEach((point) => {
    mapEditorStore.updatePoint(point.id, {
      editorProps: {
        ...point.editorProps,
        labelVisible: showLabels.value,
      },
    });
  });
  mapEditorStore.paths.forEach((path) => {
    mapEditorStore.updatePath(path.id, {
      editorProps: {
        ...path.editorProps,
        labelVisible: showLabels.value,
      },
    });
  });
  mapEditorStore.locations.forEach((location) => {
    mapEditorStore.updateLocation(location.id, {
      editorProps: {
        ...location.editorProps,
        labelVisible: showLabels.value,
      },
    });
  });
};

// 切换Block显示
const toggleBlocks = () => {
  showBlocks.value = !showBlocks.value;
  // 通过 ref 调用子组件的方法
  if (mapCanvasRef.value) {
    (mapCanvasRef.value as any).setBlocksVisible?.(showBlocks.value);
  }
};

// 监听画布的鼠标位置变化
watch(
  () => mapCanvasRef.value,
  (canvas) => {
    if (canvas) {
      // 定期更新鼠标位置
      const updateMousePosition = () => {
        try {
          const pos = (canvas as any).getMousePosition?.();
          if (pos) {
            mousePosition.value = pos;
          }
        } catch (e) {
          // 忽略错误
        }
      };

      // 使用 requestAnimationFrame 更新
      let rafId: number;
      const update = () => {
        updateMousePosition();
        rafId = requestAnimationFrame(update);
      };
      rafId = requestAnimationFrame(update);

      onUnmounted(() => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      });
    }
  },
  { immediate: true },
);

// 拖拽调整左侧面板宽度
const handleResizeStart = (e: MouseEvent) => {
  isResizing.value = true;
  resizeStartX.value = e.clientX;
  resizeStartWidth.value = leftPanelWidth.value;

  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  e.preventDefault();
};

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return;

  const deltaX = e.clientX - resizeStartX.value;
  const newWidth = resizeStartWidth.value + deltaX;

  // 限制宽度范围
  leftPanelWidth.value = Math.max(
    LEFT_PANEL_MIN_WIDTH,
    Math.min(LEFT_PANEL_MAX_WIDTH, newWidth),
  );
};

const handleResizeEnd = () => {
  if (!isResizing.value) return;

  isResizing.value = false;
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  // 保存宽度到 localStorage
  localStorage.setItem(LEFT_PANEL_WIDTH_KEY, leftPanelWidth.value.toString());
};

// 初始化网格大小为20（固定值）
onMounted(async () => {
  // 从 localStorage 加载面板宽度
  const savedWidth = localStorage.getItem(LEFT_PANEL_WIDTH_KEY);
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    if (width >= LEFT_PANEL_MIN_WIDTH && width <= LEFT_PANEL_MAX_WIDTH) {
      leftPanelWidth.value = width;
    }
  }

  // 从 localStorage 加载属性/图层面板折叠状态
  const savedPropertyCollapsed = localStorage.getItem(
    PROPERTY_PANEL_COLLAPSED_KEY,
  );
  const savedLayerCollapsed = localStorage.getItem(LAYER_PANEL_COLLAPSED_KEY);
  if (savedPropertyCollapsed !== null) {
    isPropertyPanelCollapsed.value = savedPropertyCollapsed === "1";
  }
  if (savedLayerCollapsed !== null) {
    isLayerPanelCollapsed.value = savedLayerCollapsed === "1";
  }

  // 从 localStorage 加载属性/图层面板高度
  const savedPropertyHeight = localStorage.getItem(PROPERTY_PANEL_HEIGHT_KEY);
  const savedLayerHeight = localStorage.getItem(LAYER_PANEL_HEIGHT_KEY);
  if (savedPropertyHeight) {
    const p = parseInt(savedPropertyHeight, 10);
    if (!Number.isNaN(p)) {
      propertyPanelHeight.value = p;
    }
  }
  if (savedLayerHeight) {
    const l = parseInt(savedLayerHeight, 10);
    if (!Number.isNaN(l)) {
      layerPanelHeight.value = l;
    }
  }

  // 根据折叠状态应用高度
  nextTick(() => {
    const propertyEl = document.querySelector(
      ".left-panels .property-panel-container",
    ) as HTMLElement | null;
    const layerEl = document.querySelector(
      ".left-panels .layer-panel-container",
    ) as HTMLElement | null;

    if (propertyEl) {
      if (isPropertyPanelCollapsed.value) {
        propertyEl.style.height = "";
      } else if (propertyPanelHeight.value !== null) {
        propertyEl.style.height = `${propertyPanelHeight.value}px`;
      }
    }

    if (layerEl) {
      if (isLayerPanelCollapsed.value) {
        layerEl.style.height = "";
      } else {
        const h = layerPanelHeight.value ?? DEFAULT_LAYER_PANEL_HEIGHT;
        layerEl.style.height = `${h}px`;
      }
    }
  });

  // 加载地图数据：
  // - 如果带有 mapId（从地图列表”编辑”跳转），则从后端加载对应地图
  // - 如果没有 mapId（从左侧菜单直接打开），则进入”空白编辑器”模式，不再强制调用 loadMap，避免报错
  // 优先使用：1. props.mapId  2. route.query.mapId  3. 当前活动标签页的ID
  let loadedMapId = props.mapId || (route.query.mapId as string);
  if (!loadedMapId && mapEditorTabsStore.activeTab) {
    loadedMapId = mapEditorTabsStore.activeTab.id;
  }
  if (loadedMapId) {
    try {
      await mapEditorStore.loadMap(loadedMapId);
      ElMessage.success("地图加载成功");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.msg || error?.message || "加载失败";
      ElMessage.error("加载地图失败：" + errorMessage);
      console.error("加载错误详情:", error);
    }
  } else {
    // 从菜单直接打开：重置为干净状态，由用户通过”导入地图 / 导入 openTCS 模型”加载数据
    mapEditorStore.reset();
  }

  // 注册键盘事件
  window.addEventListener("keydown", handleKeyDown);

  // 确保网格大小为20（MapCanvas组件默认就是20，这里确保一下）
  nextTick(() => {
    if (mapCanvasRef.value) {
      (mapCanvasRef.value as any).setGridSize(20);
    }
  });
});

// 发布状态加载中
const publishLoading = ref(false);

// 发布地图
const handlePublish = async () => {
  try {
    const mapId = mapEditorStore.currentMapModelId;
    if (!mapId) {
      ElMessage.error("地图ID不存在");
      return;
    }
    await ElMessageBox.confirm("发布后该地图将生效，确定要发布吗？", "发布确认", {
      confirmButtonText: "确定发布",
      cancelButtonText: "取消",
      type: "warning",
    });

    publishLoading.value = true;
    await publishMap(mapId);

    // 更新本地状态
    if (mapEditorStore.mapData?.mapInfo) {
      mapEditorStore.mapData.mapInfo.status = "1";
    }

    ElMessage.success("发布成功");
  } catch (error: any) {
    if (error !== 'cancel') {
      const errorMessage =
        error?.response?.data?.msg || error?.message || "发布失败";
      ElMessage.error("发布失败：" + errorMessage);
      console.error("发布错误详情:", error);
    }
  } finally {
    publishLoading.value = false;
  }
};

// 保存
const handleSave = async () => {
  try {
    await mapEditorStore.saveMap();
    ElMessage.success("保存成功");
    // 通知父组件地图已更新
    const mapName =
      mapEditorStore.mapData?.mapInfo?.name || props.mapName || "未命名";
    emit("map-updated", mapName);
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.msg || error?.message || "保存失败";
    ElMessage.error("保存失败：" + errorMessage);
    console.error("保存错误详情:", error);
  }
};

// 关闭编辑器
const handleClose = async () => {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm("有未保存的更改，是否保存？", "提示", {
        confirmButtonText: "保存",
        cancelButtonText: "不保存",
        distinguishCancelAndClose: true,
        type: "warning",
      });
      await handleSave();
    } catch (error) {
      // 用户取消或选择不保存
    }
  }

  router.back();
};

// 处理点双击事件
const handlePointDoubleClick = (point: MapPoint) => {
  currentEditPoint.value = point;
  showPointEditDialog.value = true;
};

// 处理点更新后的回调
const handlePointUpdated = () => {
  // 刷新视图
};

// 快速复制选中元素（带偏移粘贴）
const handleQuickDuplicate = () => {
  const selectedIds = mapEditorStore.selection.selectedIds;
  if (selectedIds.size === 0) {
    ElMessage.warning("请先选择要复制的元素");
    return;
  }
  mapEditorStore.duplicateSelected();
  ElMessage.success("已复制选中元素");
};

// 导出地图
const handleExportMap = () => {
  if (!mapEditorStore.mapData) {
    ElMessage.warning("没有可导出的地图数据");
    return;
  }

  // 创建导出数据
  const exportData = {
    ...mapEditorStore.mapData,
    exportTime: new Date().toISOString(),
  };

  // 转换为JSON字符串
  const jsonString = JSON.stringify(exportData, null, 2);

  // 创建Blob对象
  const blob = new Blob([jsonString], { type: "application/json" });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${mapEditorStore.mapData.mapInfo.name || "map"}_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  ElMessage.success("地图导出成功");
};

// 导出 openTCS 模型（当前使用后端导出的 PlantModel JSON）
const handleExportModel = async () => {
  const modelId = mapEditorStore.currentMapModelId;
  if (!modelId) {
    ElMessage.warning("当前没有可导出的地图模型");
    return;
  }
  try {
    const blob = await exportMapFile(modelId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mapEditorStore.mapData?.mapInfo.name || "plant_model"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success("openTCS 模型导出成功");
  } catch (error: any) {
    ElMessage.error("导出 openTCS 模型失败：" + (error?.message || "未知错误"));
  }
};

// 导入地图
const handleImportMap = () => {
  // 创建文件输入元素
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      return;
    }

    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importData = JSON.parse(content);

        // 确认导入
        await ElMessageBox.confirm(
          `确定要导入地图 "${importData.mapInfo?.name || "未知"}" 吗？这将覆盖当前地图数据。`,
          "确认导入",
          {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning",
          },
        );

        // 重置编辑器
        mapEditorStore.reset();

        // 加载导入的数据
        mapEditorStore.mapData = importData;
        mapEditorStore.layerGroups = importData.layerGroups || [];
        mapEditorStore.layers = importData.layers || [];
        mapEditorStore.points = importData.elements?.points || [];
        mapEditorStore.paths = importData.elements?.paths || [];
        mapEditorStore.locations = importData.elements?.locations || [];

        // 更新画布状态
        if (importData.mapInfo) {
          mapEditorStore.updateCanvasState({
            width: importData.mapInfo.width || 1920,
            height: importData.mapInfo.height || 1080,
            scale: importData.mapInfo.scale || 1,
            offsetX: importData.mapInfo.offsetX || 0,
            offsetY: importData.mapInfo.offsetY || 0,
          });
        }

        // 设置激活图层
        if (mapEditorStore.layers.length > 0) {
          mapEditorStore.setActiveLayer(mapEditorStore.layers[0].id);
        }

        ElMessage.success("地图导入成功");
      } catch (error: any) {
        if (error.message !== "cancel") {
          ElMessage.error("导入失败：" + error.message);
        }
      }
    };

    reader.readAsText(file);
  };

  input.click();
};

// 导入 openTCS 模型文件（调用后端导入接口）
const handleImportModel = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.xml";

  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      return;
    }

    const file = target.files[0];
    try {
      await importMapFile(file);
      ElMessage.success("openTCS 模型导入成功，请在地图列表中查看新建地图");
    } catch (error: any) {
      ElMessage.error(
        "导入 openTCS 模型失败：" + (error?.message || "未知错误"),
      );
    }
  };

  input.click();
};

// 导入导航站点（stations.json）
const handleImportStations = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) {
      return;
    }

    const file = target.files[0];
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const stations: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.stations)
          ? json.stations
          : [];

      if (!stations.length) {
        ElMessage.error("文件中未找到 stations 数组");
        return;
      }

      if (!mapEditorStore.mapData) {
        ElMessage.warning("请先加载或创建地图后再导入站点");
        return;
      }

      // 识别为工厂模型点元素：直接复用现有点位图层；仅当没有任何点位图层时才新建一个（并优先复用已有图层组）
      let pointLayer =
        mapEditorStore.layers.find(
          (l) =>
            l.id === mapEditorStore.activeLayerId && l.type === LayerType.POINT,
        ) || mapEditorStore.layers.find((l) => l.type === LayerType.POINT);
      if (!pointLayer) {
        const existingGroup =
          mapEditorStore.layerGroups.find(
            (g) => g.name === "Default layer group" || g.name === "默认图层组",
          ) || mapEditorStore.layerGroups[0];
        const layerGroupId = existingGroup
          ? existingGroup.id
          : mapEditorStore.addLayerGroup({
              name: "Default layer group",
              visible: true,
            }).id;
        pointLayer = mapEditorStore.addLayer({
          name: "Default layer",
          type: LayerType.POINT,
          layerGroupId,
          visible: true,
          locked: false,
          zIndex: 1,
          opacity: 1,
          elementIds: [],
        });
        mapEditorStore.setActiveLayer(pointLayer.id);
      }

      let created = 0;

      // 若有已导入的导航栅格图，用其偏移量将点对齐到栅格图上（与 MapCanvas 放置方式一致）
      const raster = mapEditorStore.rasterBackground;
      const canvas = canvasState.value;
      const canvasWidth = canvas.width || 1920;
      const canvasHeight = canvas.height || 1080;
      const rasterOffsetX =
        raster && typeof raster.widthPx === "number"
          ? (canvasWidth - raster.widthPx) / 2
          : 0;
      const rasterOffsetY =
        raster && typeof raster.heightPx === "number"
          ? (canvasHeight - raster.heightPx) / 2
          : 0;

      stations.forEach((station: any) => {
        const pos = station?.position;
        const hasWorld =
          pos && typeof pos.x === "number" && typeof pos.y === "number";
        const hasImage =
          raster &&
          typeof station.imageX === "number" &&
          typeof station.imageY === "number";

        if (!hasWorld && !hasImage) {
          return;
        }

        const name: string = station.name || mapEditorStore.generatePointName();
        const descriptionParts: string[] = [];
        if (station.type !== undefined) {
          descriptionParts.push(`navType=${station.type}`);
        }
        if (typeof station.yaw === "number") {
          descriptionParts.push(`yaw=${station.yaw}`);
        }
        const description = descriptionParts.join(" ");

        // 优先用 imageX/imageY 对齐到导航栅格图；否则用导航 position.x/y 作为模型坐标
        const x = hasImage ? rasterOffsetX + station.imageX : pos.x;
        const y = hasImage ? rasterOffsetY + station.imageY : pos.y;

        mapEditorStore.addPoint({
          id: station.id ? String(station.id) : undefined,
          layerId: pointLayer.id,
          name,
          x,
          y,
          z: hasWorld && typeof pos.z === "number" ? pos.z : undefined,
          type: mapEditorStore.pointType,
          description,
          status: "0",
          editorProps: {
            radius: DEFAULT_POINT_OUTER_RADIUS,
            color: "#ff4d4f",
            label: name,
            labelVisible: true,
          },
        });
        created += 1;
      });

      if (created === 0) {
        ElMessage.warning("未成功导入任何导航站点，请检查坐标数据是否完整");
        return;
      }

      ElMessage.success(`已导入 ${created} 个导航站点`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      ElMessage.error("导入导航站点失败：" + msg);
    } finally {
      input.value = "";
    }
  };

  input.click();
};

// 导出/导入下拉菜单命令分发
const handleExportCommand = (command: "editor" | "model") => {
  if (command === "editor") {
    handleExportMap();
  } else {
    handleExportModel();
  }
};

const handleImportCommand = (command: "editor" | "model") => {
  if (command === "editor") {
    handleImportMap();
  } else {
    handleImportModel();
  }
};

// 导出图片
const handleExportImage = (format: "png" | "svg") => {
  const mapCanvas = mapCanvasRef.value;
  if (!mapCanvas) {
    ElMessage.error("画布组件未就绪");
    return;
  }

  // 调用MapCanvas的导出方法
  mapCanvas
    .exportAsImage(format)
    .then((dataUrl: string) => {
      // 创建下载链接
      const link = document.createElement("a");
      const mapName = mapEditorStore.mapData?.mapInfo?.name || "map";
      link.download = `${mapName}_${Date.now()}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      ElMessage.success(`已导出 ${format.toUpperCase()} 图片`);
    })
    .catch((error: any) => {
      ElMessage.error("导出失败: " + error.message);
    });
};

// ---------- 导入栅格地图（map.yaml + map.pgm）----------
function parseMapYaml(
  text: string,
): { resolution: number; originX: number; originY: number } | null {
  let resolution = 0.05;
  let originX = 0;
  let originY = 0;
  const resMatch = text.match(/resolution:\s*([\d.]+)/);
  if (resMatch) resolution = parseFloat(resMatch[1]);
  // 支持 origin: [x, y] 或 origin: [x, y, z]
  const originMatch = text.match(
    /origin:\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)(?:\s*,\s*[-\d.]+)?\s*\]/,
  );
  if (originMatch) {
    originX = parseFloat(originMatch[1]);
    originY = parseFloat(originMatch[2]);
  }
  return { resolution, originX, originY };
}

const openImportRasterDialog = () => {
  nextTick(() => {
    importRasterDialogVisible.value = true;
  });
};

const resetImportRasterState = () => {
  rasterYamlFile.value = null;
  rasterPgmFile.value = null;
  rasterYamlFileName.value = "";
  rasterPgmFileName.value = "";
  rasterParsedInfo.value = null;
  if (yamlInputRef.value) yamlInputRef.value.value = "";
  if (pgmInputRef.value) pgmInputRef.value.value = "";
};

const triggerYamlSelect = () => {
  yamlInputRef.value?.click();
};

const triggerPgmSelect = () => {
  pgmInputRef.value?.click();
};

const onYamlFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  rasterYamlFile.value = file;
  rasterYamlFileName.value = file.name;
  try {
    const text = await file.text();
    rasterParsedInfo.value = parseMapYaml(text);
  } catch {
    rasterParsedInfo.value = null;
  }
};

const onPgmFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  rasterPgmFile.value = file;
  rasterPgmFileName.value = file.name;
};

const confirmImportRaster = async () => {
  const yamlFile = rasterYamlFile.value;
  const pgmFile = rasterPgmFile.value;
  if (!yamlFile || !pgmFile) {
    ElMessage.warning("请先选择 map.yaml 和 map.pgm 文件");
    return;
  }
  importRasterLoading.value = true;
  try {
    const yamlText = await yamlFile.text();
    const parsed = parseMapYaml(yamlText);
    if (!parsed) {
      ElMessage.warning("无法解析 YAML 中的 resolution 与 origin");
      return;
    }
    const arrayBuffer = await pgmFile.arrayBuffer();
    const { dataUrl, width, height } = await parsePgmToDataUrl(arrayBuffer);

    // 获取当前地图的版本号
    const mapId =
      props.mapId ||
      route.query.mapId ||
      (mapEditorTabsStore.activeTab?.id as string);
    const dbId = mapEditorStore.mapData?.mapInfo?.id;
    let currentVersion = 0;
    if (dbId) {
      try {
        const mapRes = await request({
          url: `/factory/map/${dbId}`,
          method: "get",
        });
        if (mapRes.code === 200 && mapRes.data) {
          currentVersion = mapRes.data.rasterVersion || 0;
        }
      } catch (e) {
        console.error("获取地图信息失败", e);
      }
    }

    // 上传到 OSS
    const formData = new FormData();
    formData.append("file", pgmFile);
    const ossRes = await request({
      url: "/resource/oss/upload",
      method: "post",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    let newRasterUrl = "";
    if (ossRes.code === 200 && ossRes.data) {
      newRasterUrl = ossRes.data.url;
    } else {
      ElMessage.warning("上传失败，将仅在本地显示");
    }

    // 更新数据库中的底图信息
    if (dbId && newRasterUrl) {
      try {
        await updateNavigationMap({
          id: Number(dbId),
          rasterUrl: newRasterUrl,
          rasterVersion: currentVersion + 1,
          rasterWidth: width,
          rasterHeight: height,
          rasterResolution: parsed.resolution,
        } as any);
        ElMessage.success(`底图已更新，版本号: v${currentVersion + 1}`);
      } catch (e) {
        console.error("更新底图信息失败", e);
        ElMessage.warning("底图已上传但更新版本号失败");
      }
    }

    // PGM 仅作为背景参考，原点固定在画布 (0,0)
    const payload: RasterBackground = {
      imageDataUrl: dataUrl,
      originX: 0,
      originY: 0,
      resolution: parsed.resolution,
      widthPx: width,
      heightPx: height,
    };
    mapEditorStore.setRasterBackground(payload);
    importRasterDialogVisible.value = false;
    resetImportRasterState();
    ElMessage.success("栅格地图已导入，底图加载中… 若未看到请平移/缩放画布");
  } catch (err: any) {
    const msg = err?.message || (err ? String(err) : "未知错误");
    ElMessage.error("导入栅格地图失败：" + msg);
  } finally {
    importRasterLoading.value = false;
  }
};

// 栅格坐标校准相关函数
const openRasterCalibrateDialog = () => {
  const raster = mapEditorStore.rasterBackground;
  if (!raster) {
    ElMessage.warning("请先导入栅格地图");
    return;
  }
  rasterCalibrateForm.originX = raster.originX;
  rasterCalibrateForm.originY = raster.originY;
  rasterCalibrateForm.resolution = raster.resolution;
  rasterCalibrateDialogVisible.value = true;
};

const applyRasterCalibration = () => {
  const raster = mapEditorStore.rasterBackground;
  if (!raster) {
    ElMessage.warning("没有栅格底图");
    return;
  }
  mapEditorStore.setRasterBackground({
    ...raster,
    originX: rasterCalibrateForm.originX,
    originY: rasterCalibrateForm.originY,
    resolution: rasterCalibrateForm.resolution,
  });
  rasterCalibrateDialogVisible.value = false;
  ElMessage.success("栅格坐标已更新");
};

const resetRasterOrigin = () => {
  rasterCalibrateForm.originX = 0;
  rasterCalibrateForm.originY = 0;
};

const centerRasterInView = () => {
  const raster = mapEditorStore.rasterBackground;
  if (!raster) return;

  // 计算栅格中心在地图坐标中的位置
  const centerX = raster.originX + (raster.widthPx * raster.resolution) / 2;
  const centerY = raster.originY + (raster.heightPx * raster.resolution) / 2;

  // 获取画布尺寸
  const canvasState = mapEditorStore.canvasState || {
    width: 1920,
    height: 1080,
  };

  // 将视图中心移动到栅格中心
  mapEditorStore.updateCanvasState({
    offsetX: canvasState.width / 2 - centerX,
    offsetY: canvasState.height / 2 - centerY,
  });
  ElMessage.success("已定位到栅格中心");
};

const removeRasterBackground = async () => {
  try {
    await ElMessageBox.confirm("确定要移除栅格底图吗？", "确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    mapEditorStore.setRasterBackground(null);
    ElMessage.success("栅格底图已移除");
  } catch {
    // 用户取消
  }
};

// 版本历史相关函数
const openVersionHistoryDialog = () => {
  refreshVersionList();
  versionHistoryDialogVisible.value = true;
};

const refreshVersionList = () => {
  versionHistoryList.value = mapEditorStore.getVersionHistory().reverse();
};

const formatVersionTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const createVersionSnapshot = async () => {
  try {
    const { value } = await ElMessageBox.prompt("请输入版本描述", "创建快照", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：添加了工作站点位",
      inputValue: `手动保存 ${versionHistoryList.value.length + 1}`,
    });
    if (value) {
      mapEditorStore.saveVersion(value);
      refreshVersionList();
      ElMessage.success("版本快照已保存");
    }
  } catch {
    // 用户取消
  }
};

const restoreVersion = async (versionId: string) => {
  try {
    await ElMessageBox.confirm(
      "确定要恢复到该版本吗？当前未保存的更改将丢失。",
      "确认恢复",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
    mapEditorStore.restoreVersion(versionId);
    refreshVersionList();
    ElMessage.success("已恢复到指定版本");
  } catch (err: any) {
    if (err !== "cancel") {
      ElMessage.error("恢复失败：" + (err?.message || "未知错误"));
    }
  }
};

const deleteVersion = (versionId: string) => {
  const versions = mapEditorStore.versionHistory;
  const index = versions.findIndex((v) => v.id === versionId);
  if (index !== -1) {
    versions.splice(index, 1);
    refreshVersionList();
    ElMessage.success("版本已删除");
  }
};

// 版本对比相关函数
const openVersionCompareDialog = () => {
  compareVersionA.value = "";
  compareVersionB.value = "";
  compareResult.value = null;
  versionCompareDialogVisible.value = true;
};

const runVersionCompare = () => {
  if (!compareVersionA.value || !compareVersionB.value) {
    ElMessage.warning("请选择两个版本进行对比");
    return;
  }

  const versions = mapEditorStore.versionHistory;
  const versionA = versions.find((v) => v.id === compareVersionA.value);
  const versionB = versions.find((v) => v.id === compareVersionB.value);

  if (!versionA || !versionB) {
    ElMessage.error("版本不存在");
    return;
  }

  // 对比点位
  const pointsResult = compareElements(
    versionA.points,
    versionB.points,
    "point",
  );

  // 对比路径
  const pathsResult = compareElements(versionA.paths, versionB.paths, "path");

  // 对比位置
  const locationsResult = compareElements(
    versionA.locations,
    versionB.locations,
    "location",
  );

  compareResult.value = {
    points: pointsResult,
    paths: pathsResult,
    locations: locationsResult,
  };
};

interface CompareItem {
  id: string;
  name: string;
  changeType: "added" | "removed" | "modified" | "unchanged";
  changes?: Record<string, { from: any; to: any }>;
  [key: string]: any;
}

const compareElements = (
  oldList: any[],
  newList: any[],
  type: "point" | "path" | "location",
): {
  added: CompareItem[];
  removed: CompareItem[];
  modified: CompareItem[];
  all: CompareItem[];
} => {
  const oldMap = new Map(oldList.map((item) => [item.id, item]));
  const newMap = new Map(newList.map((item) => [item.id, item]));

  const added: CompareItem[] = [];
  const removed: CompareItem[] = [];
  const modified: CompareItem[] = [];
  const all: CompareItem[] = [];

  // 查找新增和修改的元素
  newMap.forEach((newItem, id) => {
    const oldItem = oldMap.get(id);
    if (!oldItem) {
      const item: CompareItem = {
        ...newItem,
        changeType: "added",
        name: newItem.name || id,
      };
      added.push(item);
      all.push(item);
    } else {
      // 检查是否修改
      const changes: Record<string, { from: any; to: any }> = {};
      const keysToCompare = ["name", "x", "y", "type", "description", "status"];
      if (type === "path") {
        keysToCompare.push("startPointId", "endPointId");
      }

      keysToCompare.forEach((key) => {
        if (oldItem[key] !== newItem[key]) {
          changes[key] = { from: oldItem[key], to: newItem[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        const item: CompareItem = {
          ...newItem,
          changeType: "modified",
          changes,
          name: newItem.name || id,
        };
        modified.push(item);
        all.push(item);
      }
    }
  });

  // 查找删除的元素
  oldMap.forEach((oldItem, id) => {
    if (!newMap.has(id)) {
      const item: CompareItem = {
        ...oldItem,
        changeType: "removed",
        name: oldItem.name || id,
      };
      removed.push(item);
      all.push(item);
    }
  });

  return { added, removed, modified, all };
};

// CSV 导入相关函数
const handleImportCsv = () => {
  importCsvDialogVisible.value = true;
};

const triggerCsvSelect = () => {
  csvInputRef.value?.click();
};

const clearCsvData = () => {
  csvParsedData.value = [];
  csvFileName.value = "";
  if (csvInputRef.value) {
    csvInputRef.value.value = "";
  }
};

const parsePointType = (typeStr: string): string => {
  if (!typeStr) return "Halt point";
  const normalized = typeStr.trim().toLowerCase();
  const typeMap: Record<string, string> = {
    halt: "Halt point",
    "halt point": "Halt point",
    park: "Park point",
    "park point": "Park point",
    station: "Station",
    charge: "Charge point",
    "charge point": "Charge point",
  };
  return typeMap[normalized] || "Halt point";
};

const onCsvFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  csvFileName.value = file.name;

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      ElMessage.warning("CSV 文件内容为空或格式不正确");
      return;
    }

    // 解析 CSV 头部
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(",").map((h) => h.trim());

    // 检查必需列
    const requiredCols = ["name", "x", "y"];
    const missingCols = requiredCols.filter((col) => !headers.includes(col));
    if (missingCols.length > 0) {
      ElMessage.warning(`CSV 文件缺少必需列: ${missingCols.join(", ")}`);
      return;
    }

    // 解析数据行
    const data: typeof csvParsedData.value = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 简单解析CSV（处理引号内包含逗号的情况）
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // 构建对象
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });

      // 验证必填字段
      let error = "";
      if (!row.name) {
        error = "缺少名称";
      } else if (!row.x || isNaN(Number(row.x))) {
        error = "X坐标无效";
      } else if (!row.y || isNaN(Number(row.y))) {
        error = "Y坐标无效";
      }

      data.push({
        name: row.name || "",
        code: row.code || undefined,
        x: Number(row.x) || 0,
        y: Number(row.y) || 0,
        type: parsePointType(row.type || ""),
        description: row.description || undefined,
        error: error || undefined,
      });
    }

    csvParsedData.value = data;

    const validCount = data.filter((d) => !d.error).length;
    if (validCount === 0) {
      ElMessage.warning("CSV 文件中没有有效数据");
    } else {
      ElMessage.success(
        `已解析 ${data.length} 条记录，其中 ${validCount} 条有效`,
      );
    }
  } catch (err: any) {
    ElMessage.error("解析 CSV 文件失败：" + (err?.message || "未知错误"));
  }
};

const confirmImportCsv = async () => {
  const validData = csvParsedData.value.filter((d) => !d.error);
  if (validData.length === 0) {
    ElMessage.warning("没有有效数据可导入");
    return;
  }

  try {
    // 获取当前激活的图层
    const activeLayerId =
      mapEditorStore.activeLayerId || mapEditorStore.layers[0]?.id;

    if (!activeLayerId) {
      ElMessage.warning("请先创建或选择一个图层");
      return;
    }

    // 生成点位
    const newPoints: MapPoint[] = validData.map((row, index) => ({
      id: `point_${Date.now()}_${index}`,
      layerId: activeLayerId,
      name: row.name,
      code: row.code,
      x: row.x,
      y: row.y,
      type: row.type,
      description: row.description,
      status: "ACTIVE",
      editorProps: {
        radius: DEFAULT_POINT_OUTER_RADIUS,
        color: "#409EFF",
        labelVisible: true,
      },
    }));

    // 添加到 store（逐个添加）
    let addedCount = 0;
    for (const point of newPoints) {
      mapEditorStore.addPoint(point);
      addedCount++;
    }

    ElMessage.success(`成功导入 ${addedCount} 个点位`);

    // 关闭对话框并清理
    importCsvDialogVisible.value = false;
    clearCsvData();
  } catch (err: any) {
    ElMessage.error("导入点位失败：" + (err?.message || "未知错误"));
  }
};

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null;
  const isTypingElement =
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      (target as any).isContentEditable);

  // 在输入框内不处理编辑器级快捷键
  if (isTypingElement) {
    return;
  }

  // Ctrl+Z 撤销
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }

  // Ctrl+Shift+Z 重做
  if (e.ctrlKey && e.shiftKey && e.key === "Z") {
    e.preventDefault();
    redo();
  }

  // Ctrl+S 保存
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    handleSave();
  }

  // Ctrl+A 全选
  if (e.ctrlKey && e.key === "a" && !e.shiftKey) {
    e.preventDefault();
    mapEditorStore.selectAll();
  }

  // Ctrl+C 复制选中元素
  if (e.ctrlKey && e.key === "c") {
    e.preventDefault();
    mapEditorStore.copySelected();
  }

  // Ctrl+V 粘贴
  if (e.ctrlKey && e.key === "v") {
    e.preventDefault();
    mapEditorStore.paste(20, 20);
  }

  // Ctrl+D 快速复制（带偏移粘贴）
  if (e.ctrlKey && e.key === "d") {
    e.preventDefault();
    handleQuickDuplicate();
  }

  // Escape 取消选择
  if (e.key === "Escape") {
    mapEditorStore.clearSelection();
  }

  // Delete / Backspace 删除选中元素
  if (
    !e.ctrlKey &&
    !e.metaKey &&
    (e.key === "Delete" || e.key === "Backspace")
  ) {
    if (!hasSelection.value) {
      // noop
    } else {
      const selectedIds = mapEditorStore.selection.selectedIds;
      const selectedType = mapEditorStore.selection.selectedType;
      if (selectedType === "layout" || selectedIds.size === 0) {
        // noop
      } else {
        e.preventDefault();
        if (selectedType === "point") {
          selectedIds.forEach((id) => mapEditorStore.deletePoint(id));
        } else if (selectedType === "path") {
          selectedIds.forEach((id) => mapEditorStore.deletePath(id));
        } else if (selectedType === "location") {
          selectedIds.forEach((id) => mapEditorStore.deleteLocation(id));
        }
        mapEditorStore.clearSelection();
      }
    }
  }

  // 漫游 / 地图元素工具不设数字键快捷键，避免与输入框外误触冲突
};

onUnmounted(() => {
  // 移除键盘事件
  window.removeEventListener("keydown", handleKeyDown);

  // 清理拖拽事件
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  // 清理仿真计时器
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }

  const appWrapper = document.querySelector(".app-wrapper");
  appWrapper?.classList.remove("map-editor-header-collapsed");

  // 重置编辑器
  mapEditorStore.reset();
});
</script>

<style scoped lang="scss">
.map-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  margin: 0 !important;
  padding: 0 !important;

  .import-raster-form {
    .import-raster-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      .label {
        min-width: 80px;
      }
      .file-name {
        color: var(--el-text-color-secondary);
        font-size: 13px;
      }
    }
    .import-raster-info {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }

  .import-csv-form {
    .import-csv-instructions {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      font-size: 13px;

      p {
        margin: 0 0 8px 0;
      }

      .csv-format {
        background: var(--el-bg-color);
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
        code {
          color: var(--el-color-primary);
        }
      }

      .format-notes {
        margin: 8px 0;
        padding-left: 20px;
        li {
          margin-bottom: 4px;
          color: var(--el-text-color-regular);
        }
      }

      .type-hint {
        margin: 8px 0 0 0;
        color: var(--el-text-color-secondary);
        font-size: 12px;
      }
    }

    .import-csv-upload {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      .file-name {
        color: var(--el-text-color-secondary);
        font-size: 13px;
      }
    }

    .import-csv-preview {
      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
      }

      .csv-error-summary {
        margin-top: 12px;
      }
    }
  }

  .raster-calibrate-form {
    .calibrate-info {
      padding: 12px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      margin-bottom: 16px;

      p {
        margin: 0 0 8px 0;
        font-weight: 500;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--el-text-color-regular);
        .label {
          color: var(--el-text-color-secondary);
        }
      }
    }

    .form-tip {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .version-history {
    .version-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .version-tip {
      margin-top: 12px;
    }
  }

  .version-compare {
    .compare-selector {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: var(--el-fill-color-light);
      border-radius: 4px;

      .selector-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .label {
          font-size: 13px;
          color: var(--el-text-color-regular);
        }
      }
    }

    .compare-result {
      .change-summary {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .change-detail {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .compare-empty {
      padding: 40px 0;
    }
  }

  // 工具栏
  .toolbar {
    height: auto;
    min-height: 58px;
    flex-shrink: 0;
    background: linear-gradient(0deg, #fafbfc 0%, #fff 100%);
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 24px;
    z-index: 100;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;

      &.toolbar-left-cluster {
        gap: 4px;
      }

      .toolbar-cluster-divider {
        flex-shrink: 0;
      }

      .pan-hand-icon {
        width: 1em;
        height: 1em;
        display: block;
      }

      :deep(.el-divider--vertical) {
        height: 44px;
        margin: 0 6px;
        align-self: center;
        border-left-color: #e0e3eb;
      }

      .el-button-group.creation-tool-group {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .export-import-group {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      // 确保 tooltip 不影响按钮布局
      :deep(.el-tooltip) {
        display: inline-block;
      }

      :deep(.el-tooltip__trigger) {
        display: inline-block;
      }

      .zoom-level {
        font-size: 12px;
        color: #606266;
        font-weight: 500;
        padding: 2px 8px;
        background: #f5f7fa;
        border-radius: 4px;
        min-width: 50px;
        text-align: center;
        margin: 0 4px;
      }

      .el-button:not(.map-toolbar-btn) {
        width: 32px;
        height: 32px;
        padding: 4px;
        border: none;
        background: transparent;
        color: #4c4c4c;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(64, 158, 255, 0.08);
          color: #1f2d3d;
        }

        &.el-button--primary {
          background: rgba(64, 158, 255, 0.14);
          color: #1f2d3d;
          border: 1px solid rgba(64, 158, 255, 0.3);
        }

        :deep(.el-icon) {
          font-size: 20px;
        }

        :deep(.svg-icon),
        :deep(svg) {
          width: 20px;
          height: 20px;
        }
      }

      .el-button-group {
        .el-button:not(.map-toolbar-btn) {
          width: 32px;
          height: 32px;
          padding: 4px;
        }
      }

      /* 图标在上、文字在下（参考深色工具条布局，配色仍用浅色主题） */
      .map-toolbar-btn {
        width: auto !important;
        min-width: 52px;
        height: auto !important;
        min-height: 52px;
        padding: 6px 8px 4px !important;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #4c4c4c;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(64, 158, 255, 0.08);
          color: #1f2d3d;
        }

        &.el-button--primary {
          background: rgba(64, 158, 255, 0.14);
          color: #1f2d3d;
          border: 1px solid rgba(64, 158, 255, 0.3);
        }

        &.is-disabled {
          opacity: 0.45;
        }

        .map-toolbar-btn__inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .map-toolbar-btn__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;

          :deep(.el-icon) {
            font-size: 20px;
          }

          :deep(.svg-icon),
          :deep(svg) {
            width: 20px;
            height: 20px;
          }
        }

        .map-toolbar-btn__label {
          font-size: 11px;
          line-height: 1.15;
          font-weight: 500;
          color: inherit;
          max-width: 64px;
          text-align: center;
          white-space: nowrap;
        }
      }

      // 分段按钮样式
      .point-tool-wrapper,
      .path-tool-wrapper {
        display: inline-flex;
        align-items: center;
        height: 32px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        background: #fff;

        .point-tool-main,
        .path-tool-main {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
          width: 32px;
          height: 32px;
          padding: 4px;
        }

        .point-tool-dropdown,
        .path-tool-dropdown {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          padding: 0 2px;
          min-width: auto;
          width: auto;
          height: 32px;

          .el-icon {
            font-size: 10px;
          }
        }

        .path-type-icon {
          margin-right: 8px;
        }

        :deep(.point-type-option) {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 160px;

          span {
            font-size: 12px;
            color: #303133;
          }
        }

        .point-type-svg-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
        }

        .dashed-link-toolbar-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
        }
      }

      // 不使用 flex order：保持模板顺序为 漫游→点→位置→三种路网连线→虚线链接→规则区域→撤销等
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;

      .collapse-toggle {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid #e0e6ef;
        background: #fff;
        color: #4c4c4c;
        padding: 0;
        transition: all 0.2s ease;

        &:hover {
          border-color: #409eff;
          color: #409eff;
          box-shadow: 0 1px 3px rgba(64, 158, 255, 0.2);
        }
      }
    }
  }
  // 主内容区
  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-width: 0;

    // 左侧面板组
    .left-panels {
      background: #fff;
      border-right: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      min-width: 0;

      .panel-container {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #e4e7ed;
        min-height: 0;

        // 视图面板始终占据剩余空间
        &:first-child {
          flex: 1;
          min-height: 150px;
        }

        // 属性面板可调整高度（通过自定义拖拽条）
        &.property-panel-container {
          flex-shrink: 0;
          overflow: hidden;

          .panel-content {
            min-height: 80px;
            max-height: none;
          }
        }

        // 图层面板可调整高度（通过自定义拖拽条），默认高度由 JS 设置，限制最大高度避免占满
        &.layer-panel-container {
          flex-shrink: 0;
          overflow: hidden;
          max-height: 50vh;

          .panel-content {
            min-height: 60px;
            max-height: none;
          }
        }

        // 最后一个面板没有底部边框
        &:last-child {
          border-bottom: none;
        }

        .panel-header {
          height: 30px;
          padding: 0 12px;
          background: #fff;
          border-bottom: 1px solid #e4e7ed;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
          flex-shrink: 0;

          &:hover {
            background: #f5f7fa;
          }

          .version-tag {
            font-size: 10px;
            padding: 0 4px;
            height: 16px;
            line-height: 14px;
          }

          .panel-title,
          .canval-title,
          .canvas-title {
            font-size: 12px;
            color: #606266;
            line-height: 1;
            font-weight: 500;
          }

          .collapse-icon {
            font-size: 14px;
            color: #909399;
            transition: transform 0.3s ease;

            &.collapsed {
              transform: rotate(-90deg);
            }
          }
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
        }
      }
    }

    // 可拖拽的分隔条
    .panel-resizer {
      width: 4px;
      background: transparent;
      cursor: col-resize;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      transition: background-color 0.2s;

      &:hover {
        background: #409eff;
      }

      &.resizing {
        background: #409eff;
      }

      &::before {
        content: "";
        position: absolute;
        left: -2px;
        right: -2px;
        top: 0;
        bottom: 0;
        cursor: col-resize;
      }
    }

    // 属性/图层之间的水平分隔条
    .panel-horizontal-resizer {
      height: 4px;
      background: transparent;
      cursor: row-resize;
      position: relative;
      z-index: 5;

      &:hover {
        background: #409eff;
      }

      &::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: -2px;
        bottom: -2px;
        cursor: row-resize;
      }
    }

    // 右侧分隔条
    .panel-resizer-right {
      order: 3;
    }

    // 画布区域
    .canvas-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-image:
        linear-gradient(#eef0f4 1px, transparent 1px),
        linear-gradient(90deg, #eef0f4 1px, transparent 1px);
      background-size: 18px 18px;
      background-color: #fff;
      overflow: hidden;
      min-width: 0;
      position: relative;

      .canvas-wrapper {
        flex: 1;
        position: relative;
        min-height: 0;

        // 确保 MapCanvas 占满剩余空间
        :deep(.map-canvas-container) {
          width: 100%;
          height: 100%;
        }
      }

      // 底部信息
      .canvas-footer {
        position: absolute;
        left: 16px;
        bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        z-index: 10;

        .mode-info {
          color: #f56c6c;
          font-weight: 500;
        }

        .footer-sep {
          color: #9ca3af;
        }

        .muted {
          color: #909399;
        }

        .mono {
          font-family: monospace;
        }

        .zoom-percent {
          color: #409eff;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f5f7fa;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    // 右侧面板
    .right-panel {
      background: #fff;
      border-left: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      order: 4;
    }
  }

  // 底部状态栏
  .status-bar {
    height: 30px;
    background: #fff;
    border-top: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    font-size: 12px;

    .status-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .edit-mode {
        color: #f56c6c;
        font-weight: 500;
      }

      .divider {
        color: #dcdfe6;
      }

      .map-id {
        color: #606266;
      }

      .selection-info {
        color: #409eff;
        font-weight: 500;
      }
    }

    .status-right {
      display: flex;
      align-items: center;
      gap: 16px;

      .zoom-level {
        color: #67c23a;
        font-weight: 500;
      }

      .coordinates {
        color: #909399;
      }

      .scale-hint {
        color: #c0c4cc;
        font-size: 11px;
      }
    }
  }
}

// 批量编辑对话框样式
.batch-type-hint {
  margin-left: 8px;
  color: #409eff;
  font-size: 12px;
}
</style>
