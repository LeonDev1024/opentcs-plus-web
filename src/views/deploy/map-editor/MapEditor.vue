<template>
  <div class="map-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left toolbar-left-cluster">
        <!-- 选择 + 漫游 -->
        <el-button-group class="creation-tool-group">
          <el-tooltip content="选择模式" :show-after="50" placement="bottom">
            <el-button
              class="map-toolbar-btn"
              :type="currentTool === 'select' ? 'primary' : 'default'"
              size="small"
              @click="setTool(ToolMode.SELECT)"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="xuanze-zhenzhe" class="select-pointer-icon" />
                </span>
                <span class="map-toolbar-btn__label">选择</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="漫游模式"
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
        <!-- 地图元素：绘制点、绘制位置、直线/直角/曲线路径、虚线链接 -->
        <el-button-group class="creation-tool-group">
          <el-tooltip
            content="绘制导航点"
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
            content="绘制工作站点"
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
          <el-tooltip content="直线路径" :show-after="50" placement="bottom">
            <el-button
              class="map-toolbar-btn"
              :type="
                currentTool === 'path' &&
                currentPathConnectionType === 'direct'
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
                      currentPathConnectionType === 'direct'
                    "
                  />
                </span>
                <span class="map-toolbar-btn__label">直线</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip content="贝塞尔曲线路径" :show-after="50" placement="bottom">
            <el-button
              class="map-toolbar-btn"
              :type="
                currentTool === 'path' && currentPathConnectionType === 'curve'
                  ? 'primary'
                  : 'default'
              "
              size="small"
              @click="handlePathToolClick('curve')"
            >
              <span class="map-toolbar-btn__inner">
                <span class="map-toolbar-btn__icon">
                  <SvgIcon icon-class="bezier" class="curve-type-svg-icon" />
                </span>
                <span class="map-toolbar-btn__label">曲线</span>
              </span>
            </el-button>
          </el-tooltip>
          <el-tooltip
            content="绘制虚线链接"
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
                  <SvgIcon
                    icon-class="dashed-link"
                    class="dashed-link-toolbar-icon"
                  />
                </span>
                <span class="map-toolbar-btn__label">虚线链接</span>
              </span>
            </el-button>
          </el-tooltip>
        </el-button-group>
        <el-divider direction="vertical" class="toolbar-cluster-divider" />
        <!-- 对齐 -->
        <el-dropdown
          trigger="click"
          :disabled="!canAlign"
          @command="handleAlign"
          class="toolbar-align-dropdown"
        >
          <el-button
            class="map-toolbar-btn"
            size="small"
            :disabled="!canAlign"
          >
            <span class="map-toolbar-btn__inner">
              <span class="map-toolbar-btn__icon toolbar-align-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="2" height="12" rx="1" fill="currentColor"/>
                  <rect x="5" y="5" width="8" height="3" rx="1" fill="currentColor"/>
                  <rect x="5" y="10" width="11" height="3" rx="1" fill="currentColor"/>
                </svg>
              </span>
              <span class="map-toolbar-btn__label">对齐</span>
              <el-icon style="margin-left:2px;font-size:10px"><ArrowDown /></el-icon>
            </span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="left">
                <span class="align-menu-icon">⊢</span> 竖向靠左对齐
              </el-dropdown-item>
              <el-dropdown-item command="right">
                <span class="align-menu-icon">⊣</span> 竖向靠右对齐
              </el-dropdown-item>
              <el-dropdown-item command="top">
                <span class="align-menu-icon">⊤</span> 横向顶部对齐
              </el-dropdown-item>
              <el-dropdown-item command="bottom">
                <span class="align-menu-icon">⊥</span> 横向底部对齐
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
      </div>
      <div class="toolbar-right">
        <el-button
          type="warning"
          size="small"
          icon="Upload"
          @click="handleImportBaseLayer"
        >
          导入底图
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

    <!-- 主内容区：画布 | 右侧面板 -->
    <div class="editor-content">
      <!-- 中间：画布区域 -->
      <div class="canvas-area">
        <!-- 标尺顶行：左上角 + 水平标尺 -->
        <div class="ruler-top-row">
          <div class="ruler-corner"><span class="ruler-unit">{{ rulerCornerUnit }}</span></div>
          <canvas ref="rulerHRef" class="ruler-h-canvas" />
        </div>
        <!-- 内容行：垂直标尺 + 画布 -->
        <div class="canvas-body-row">
          <canvas ref="rulerVRef" class="ruler-v-canvas" />
          <div class="canvas-wrapper" ref="canvasWrapperRef" @mousemove="handleRulerMouseMove">
            <MapCanvas
              ref="mapCanvasRef"
              :layer-visibility="layerVisibility"
              @point-double-click="handlePointDoubleClick"
              @path-context-menu="handlePathContextMenu"
            />
            <!-- 左上角坐标信息（相对画布绝对定位） -->
            <div class="ruler-info-box">
              <div class="rib-scale">{{ scaleBarLabel }}</div>
              <div class="rib-coord">x: {{ mouseRealXStr }}</div>
              <div class="rib-coord">y: {{ mouseRealYStr }}</div>
            </div>
          </div>
        </div>
        <div class="canvas-floating-controls">
          <div class="floating-slot">
            <el-popover placement="left" trigger="click" :width="200">
              <template #reference>
                <el-button
                  class="floating-btn floating-btn--layer"
                  :class="{ 'is-active': !layerAllVisible }"
                  size="small"
                >
                  <img
                    class="floating-layer-icon"
                    :src="layerIconUrl"
                    alt=""
                  />
                </el-button>
              </template>
              <ul class="layer-visibility-menu" @click.stop>
                <li
                  v-for="item in layerMenuItems"
                  :key="item.key"
                  class="layer-visibility-menu__item"
                  :class="{ 'is-off': !layerVisibility[item.key] }"
                  @click="toggleLayerKey(item.key)"
                >
                  <el-icon class="layer-visibility-menu__icon">
                    <View v-if="layerVisibility[item.key]" />
                    <Hide v-else />
                  </el-icon>
                  <span class="layer-visibility-menu__text">{{
                    item.label
                  }}</span>
                </li>
              </ul>
            </el-popover>
          </div>
          <div class="floating-slot">
            <el-button
              class="floating-btn mono-btn"
              size="small"
              @click="resetZoom"
              >1:1</el-button
            >
          </div>
        </div>
        <div class="canvas-footer">
          <span class="muted">编辑模式</span>
          <span class="footer-sep">·</span>
          <span class="muted">地图ID：</span>
          <span class="mono">{{ currentMapId || '-' }}</span>
          <span class="footer-sep">·</span>
          <span class="zoom-indicator" @click="resetZoom">
            {{ zoomPercent }}%
          </span>
        </div>
      </div>

      <!-- 右侧拖拽条 -->
      <div
        class="panel-resizer panel-resizer-right"
        @mousedown="handleRightResizeStart"
        :class="{ resizing: isRightResizing }"
      ></div>

      <!-- 右侧面板（常驻，含属性/图元/图层三个 tab） -->
      <div
        class="right-panel"
        :style="{ width: rightPanelWidth + 'px' }"
      >
        <div class="right-panel-tabs">
          <button
            v-for="tab in rightTabs"
            :key="tab.key"
            class="right-tab-btn"
            :class="{ 'is-active': activeRightTab === tab.key }"
            @click="activeRightTab = tab.key"
          >{{ tab.label }}</button>
        </div>
        <div class="right-panel-body">
          <PropertyPanel v-show="activeRightTab === 'property'" />
          <ComponentsPanel v-show="activeRightTab === 'components'" />
          <LayerPanel v-show="activeRightTab === 'layers'" />
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

    <!-- 导入底图对话框 -->
    <ImportBaseLayerDialog
      ref="importBaseLayerDialogRef"
      v-model="showImportBaseLayerDialog"
      @import="handleBaseLayerImport"
    />

    <!-- 路径右键上下文菜单 -->
    <div
      v-if="pathContextMenu.visible"
      class="path-context-menu"
      :style="{ left: pathContextMenu.x + 'px', top: pathContextMenu.y + 'px' }"
      @click.stop
    >
      <ul class="path-context-menu__list">
        <li class="path-context-menu__item" @click="handleReversePathDirection">
          <el-icon><Sort /></el-icon>
          <span>反转方向</span>
        </li>
        <li class="path-context-menu__divider" />
        <li class="path-context-menu__item path-context-menu__item--danger" @click="handleDeletePathFromMenu">
          <el-icon><Delete /></el-icon>
          <span>删除路径</span>
        </li>
      </ul>
    </div>
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
import type { MapLayerVisibility, MapPath } from "@/types/mapEditor";
import { defaultMapLayerVisibility } from "@/types/mapEditor";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import { useMapStore } from "@/store/modules/map";
import layerIconUrl from "@/assets/icons/svg/layer.svg?url";
import propertyPanelIconUrl from "@/assets/icons/svg/shuxing-guanli.svg?url";
import MapCanvas from "./components/MapCanvas.vue";
import LayerPanel from "./components/LayerPanel.vue";
import ComponentsPanel from "./components/ComponentsPanel.vue";
import PropertyPanel from "./components/PropertyPanel.vue";
import PointEditDialog from "./components/PointEditDialog.vue";
import ImportBaseLayerDialog from "./components/ImportBaseLayerDialog.vue";
import { useMapEditorStore } from "@/store/modules/mapEditor";
import { useMapEditorTabsStore } from "@/store/modules/mapEditorTabs";
import { ToolMode, LayerType } from "@/types/mapEditor";
import type { MapPoint } from "@/types/mapEditor";
import { DEFAULT_POINT_OUTER_RADIUS } from "@/utils/mapEditor/mapVisualTokens";
import PathTypeIcon from "./components/icons/PathTypeIcon.vue";
import SvgIcon from "@/components/SvgIcon/index.vue";
import { exportMapFile, importMapFile, publishMap } from "@/api/deploy/map-editor";
import { updateNavigationMap } from "@/api/deploy/factory/map";
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
  View,
  Hide,
  Grid,
  DArrowRight,
  Upload,
  Sort,
  ArrowDown,
} from "@element-plus/icons-vue";
import { parsePgmToDataUrl } from "@/utils/mapEditor/pgmParser";
import {
  computeRasterModelLayout,
  resolveScaleMmPerUnitForRaster,
  viewportOffsetForModelOrigin,
} from "@/utils/mapEditor/rasterAlignment";
import type { RasterBackground } from "@/types/mapEditor";
import request from "@/utils/request";
import { uploadOss } from "@/api/system/management/oss/upload";

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

// 图层显隐（与画布 props 同步）
const layerVisibility = reactive<MapLayerVisibility>(
  defaultMapLayerVisibility(),
);

const layerMenuItems: { key: keyof MapLayerVisibility; label: string }[] = [
  { key: "station", label: "站点显隐" },
  { key: "pathDirection", label: "方向显隐" },
  { key: "raster", label: "底图显隐" },
];

function toggleLayerKey(key: keyof MapLayerVisibility) {
  layerVisibility[key] = !layerVisibility[key];
  const stateText = layerVisibility[key] ? "显示" : "隐藏";
  const labelText = layerMenuItems.find((m) => m.key === key)?.label || "图层";
  ElMessage.info(`${labelText.replace("显隐", "")}已${stateText}`);
}

const layerAllVisible = computed(() =>
  (Object.keys(layerVisibility) as (keyof MapLayerVisibility)[]).every(
    (k) => layerVisibility[k],
  ),
);

// 鼠标位置（从画布组件获取）
const mousePosition = ref({ x: 0, y: 0 });

// 路径右键菜单
const pathContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  pathId: '' as string,
});

const handlePathContextMenu = (path: MapPath, clientX: number, clientY: number) => {
  pathContextMenu.pathId = path.id;
  pathContextMenu.x = clientX;
  pathContextMenu.y = clientY;
  pathContextMenu.visible = true;
};

const closePathContextMenu = () => {
  pathContextMenu.visible = false;
};

const handleReversePathDirection = () => {
  if (pathContextMenu.pathId) {
    mapEditorStore.reversePath(pathContextMenu.pathId);
    ElMessage.success('路径方向已反转');
  }
  closePathContextMenu();
};

const handleDeletePathFromMenu = () => {
  if (pathContextMenu.pathId) {
    mapEditorStore.deletePath(pathContextMenu.pathId);
    ElMessage.success('路径已删除');
  }
  closePathContextMenu();
};

// 点编辑对话框
const showPointEditDialog = ref(false);
const currentEditPoint = ref<MapPoint | null>(null);

// 导入底图对话框
const showImportBaseLayerDialog = ref(false);
const importBaseLayerDialogRef = ref();
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

// 左侧 Activity Bar：侧栏开关与当前 Tab（视图 | 图层）
const activeSidebarTab = ref<"view" | "layers">("view");
const leftSidebarOpen = ref(true);
const LEFT_SIDEBAR_OPEN_KEY = "map-editor-left-sidebar-open";
const ACTIVE_SIDEBAR_TAB_KEY = "map-editor-active-sidebar-tab";

function persistSidebarPrefs() {
  localStorage.setItem(LEFT_SIDEBAR_OPEN_KEY, leftSidebarOpen.value ? "1" : "0");
  localStorage.setItem(ACTIVE_SIDEBAR_TAB_KEY, activeSidebarTab.value);
}

/** 再点同一图标可收起侧栏（类 VS Code） */
function onActivityView() {
  if (leftSidebarOpen.value && activeSidebarTab.value === "view") {
    leftSidebarOpen.value = false;
  } else {
    activeSidebarTab.value = "view";
    leftSidebarOpen.value = true;
  }
  persistSidebarPrefs();
}

function onActivityLayers() {
  if (leftSidebarOpen.value && activeSidebarTab.value === "layers") {
    leftSidebarOpen.value = false;
  } else {
    activeSidebarTab.value = "layers";
    leftSidebarOpen.value = true;
  }
  persistSidebarPrefs();
}

// 右侧属性面板宽度与收起
const isRightPanelCollapsed = ref(false);
const RIGHT_PANEL_COLLAPSED_KEY = "map-editor-right-panel-collapsed";
const RIGHT_PANEL_MIN_WIDTH = 240;
const RIGHT_PANEL_MAX_WIDTH = 520;
const RIGHT_PANEL_DEFAULT_WIDTH = 300;
const RIGHT_PANEL_WIDTH_KEY = "map-editor-right-panel-width";
const rightPanelWidth = ref(RIGHT_PANEL_DEFAULT_WIDTH);

// 右侧面板 tab
const activeRightTab = ref('property')
const rightTabs = [
  { key: 'property', label: '属性' },
  { key: 'components', label: '图元' },
  { key: 'layers', label: '图层' },
]
const isRightResizing = ref(false);
const rightResizeStartX = ref(0);
const rightResizeStartWidth = ref(0);

function toggleRightPanelCollapsed() {
  isRightPanelCollapsed.value = !isRightPanelCollapsed.value;
  localStorage.setItem(
    RIGHT_PANEL_COLLAPSED_KEY,
    isRightPanelCollapsed.value ? "1" : "0",
  );
}

const handleRightResizeStart = (e: MouseEvent) => {
  isRightResizing.value = true;
  rightResizeStartX.value = e.clientX;
  rightResizeStartWidth.value = rightPanelWidth.value;
  document.addEventListener("mousemove", handleRightResizeMove);
  document.addEventListener("mouseup", handleRightResizeEnd);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  e.preventDefault();
};

const handleRightResizeMove = (e: MouseEvent) => {
  if (!isRightResizing.value) return;
  const deltaX = rightResizeStartX.value - e.clientX;
  const newWidth = rightResizeStartWidth.value + deltaX;
  rightPanelWidth.value = Math.max(
    RIGHT_PANEL_MIN_WIDTH,
    Math.min(RIGHT_PANEL_MAX_WIDTH, newWidth),
  );
};

const handleRightResizeEnd = () => {
  if (!isRightResizing.value) return;
  isRightResizing.value = false;
  document.removeEventListener("mousemove", handleRightResizeMove);
  document.removeEventListener("mouseup", handleRightResizeEnd);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, rightPanelWidth.value.toString());
};

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
  const issues: Array<{
    id: string;
    type: "disconnected" | "intersection" | "radius" | "overlap";
    severity: "warning" | "error";
    message: string;
    elementIds: string[];
    position?: { x: number; y: number };
  }> = [];
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
const currentMapId = computed(() => mapEditorStore.currentMapId);
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
  const baseScale =
    typeof base === "number"
      ? base
      : base != null
        ? parseFloat(String(base))
        : 1;
  const denom = Number.isFinite(baseScale) && baseScale !== 0 ? baseScale : 1;
  return Math.round((canvasScale.value / denom) * 100);
});

// ── 标尺 ──────────────────────────────────────────────────────────────────
const RULER_H = 20   // 水平标尺高度 (px)
const RULER_W = 24   // 垂直标尺宽度 (px)
const RULER_BG = '#f7f8fa'
const RULER_FG = '#888'
const RULER_BORDER = '#ddd'
const RULER_TICK = '#bbb'

const canvasWrapperRef = ref<HTMLElement | null>(null)
const rulerHRef = ref<HTMLCanvasElement | null>(null)
const rulerVRef = ref<HTMLCanvasElement | null>(null)
const mouseScreenX = ref(0)
const mouseScreenY = ref(0)

const mouseMapX = computed(() => {
  const cs = canvasState.value
  return cs ? (mouseScreenX.value - cs.offsetX) / cs.scale : 0
})
const mouseMapY = computed(() => {
  const cs = canvasState.value
  return cs ? (mouseScreenY.value - cs.offsetY) / cs.scale : 0
})

function fmtRulerCoord(mapUnits: number, mmPerUnit: number | null): string {
  if (mmPerUnit != null && mmPerUnit > 0) {
    const mm = mapUnits * mmPerUnit
    return Math.abs(mm) >= 1000 ? `${(mm / 1000).toFixed(3)} m` : `${mm.toFixed(1)} mm`
  }
  return `${Math.round(mapUnits)}`
}

const mouseRealXStr = computed(() => fmtRulerCoord(mouseMapX.value, scaleX.value))
const mouseRealYStr = computed(() => fmtRulerCoord(mouseMapY.value, scaleY.value))

function handleRulerMouseMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  mouseScreenX.value = e.clientX - r.left
  mouseScreenY.value = e.clientY - r.top
}

// 比例尺标签（左上角显示当前缩放下 ~100px 对应的真实距离）
const SCALE_BAR_STEPS_MM = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
const SCALE_BAR_STEPS_PX = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
const scaleBarLabel = computed(() => {
  const zoom = canvasScale.value
  const mmPerUnit = scaleX.value
  if (mmPerUnit != null && mmPerUnit > 0) {
    const rawMm = 100 * mmPerUnit / zoom
    const nice = SCALE_BAR_STEPS_MM.reduce((a, b) =>
      Math.abs(b - rawMm) < Math.abs(a - rawMm) ? b : a)
    return nice >= 1000 ? `${nice / 1000} m` : `${nice} mm`
  }
  const rawPx = 100 / zoom
  const nice = SCALE_BAR_STEPS_PX.reduce((a, b) =>
    Math.abs(b - rawPx) < Math.abs(a - rawPx) ? b : a)
  return `${nice} px`
})

const rulerCornerUnit = 'cm'

// 在目标单位空间（cm 或 px）里取整数步长，目标约 80 屏幕像素一个主刻度
function pickNiceStep(visibleRange: number, screenPx: number): number {
  const rough = visibleRange / Math.max(1, screenPx / 80)
  if (!rough || !isFinite(rough) || rough <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / mag
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag
}

function drawSingleRuler(
  canvas: HTMLCanvasElement,
  isH: boolean,
  scale: number,        // 屏幕像素 / 地图单位 (zoom)
  offset: number,       // 画布偏移 (offsetX 或 offsetY)
  mmPerUnit: number | null,  // mm / 地图单位（来自 scaleX/scaleY）
): boolean {
  const cssW = canvas.offsetWidth
  const cssH = canvas.offsetHeight
  if (!cssW || !cssH) return false

  const dpr = window.devicePixelRatio || 1
  canvas.width  = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const length    = isH ? cssW : cssH
  const thickness = isH ? cssH : cssW

  ctx.fillStyle = RULER_BG
  ctx.fillRect(0, 0, cssW, cssH)

  ctx.strokeStyle = RULER_BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  if (isH) { ctx.moveTo(0, cssH - 0.5); ctx.lineTo(cssW, cssH - 0.5) }
  else      { ctx.moveTo(cssW - 0.5, 0); ctx.lineTo(cssW - 0.5, cssH) }
  ctx.stroke()

  // 全程在 cm 空间计算：cmPerUnit = mm/unit ÷ 10
  // 若无 scaleX，fallback 到像素空间（cmPerUnit=1，单位变成 px）
  const cmPerUnit = (mmPerUnit != null && mmPerUnit > 0) ? mmPerUnit / 10 : 1

  // 屏幕像素 ↔ cm
  const screenToCm = (px: number) => (px - offset) / scale * cmPerUnit
  const cmToScreen = (cm: number) => cm / cmPerUnit * scale + offset

  const cmAtStart = screenToCm(0)
  const cmAtEnd   = screenToCm(length)
  const cmMin     = Math.min(cmAtStart, cmAtEnd)
  const cmMax     = Math.max(cmAtStart, cmAtEnd)

  // 主刻度步长（cm），目标约 80px 一格
  const step = pickNiceStep(cmMax - cmMin, length)
  if (step <= 0) return true

  // 步长整除 10 用 10 等分，否则 5 等分
  const subDivs   = step % 10 < 0.0001 ? 10 : 5
  const minorStep = step / subDivs

  ctx.font = `9px Arial, system-ui, sans-serif`

  // 从第一个小刻度开始遍历
  const firstMinor = Math.floor(cmMin / minorStep) * minorStep
  for (let cm = firstMinor; cm <= cmMax + minorStep * 0.001; cm += minorStep) {
    const sp = cmToScreen(cm)
    if (sp < -1 || sp > length + 1) continue

    // 判断是否为主刻度（cm 是 step 的整数倍）
    const isMajor = Math.abs(cm / step - Math.round(cm / step)) < 0.0001

    const tickLen = isMajor ? thickness * 0.6 : thickness * 0.35
    ctx.strokeStyle = isMajor ? RULER_TICK : RULER_TICK
    ctx.lineWidth   = isMajor ? 1 : 0.5
    ctx.beginPath()
    if (isH) { ctx.moveTo(sp, cssH); ctx.lineTo(sp, cssH - tickLen) }
    else      { ctx.moveTo(cssW, sp); ctx.lineTo(cssW - tickLen, sp) }
    ctx.stroke()

    if (isMajor) {
      const rounded = Math.round(cm * 10) / 10
      const label   = Number.isInteger(rounded) ? `${Math.round(rounded)}` : rounded.toFixed(1)
      ctx.fillStyle = RULER_FG
      if (isH) {
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, sp, 2)
      } else {
        ctx.save()
<<<<<<< HEAD
        // 数字显示在左侧（靠近画布），顶部对齐
        ctx.translate(2, sp)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign    = 'left'
        ctx.textBaseline = 'top'
=======
        ctx.translate(cssW - tickLen - 2, sp)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'bottom'
>>>>>>> origin/master
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
    }
  }
  return true
}

function redrawRulers() {
  const cs = canvasState.value
  if (!cs) { requestAnimationFrame(redrawRulers); return }
  const mmX = scaleX.value
  const mmY = scaleY.value
  const okH = rulerHRef.value ? drawSingleRuler(rulerHRef.value, true,  cs.scale, cs.offsetX, mmX) : false
  const okV = rulerVRef.value ? drawSingleRuler(rulerVRef.value, false, cs.scale, cs.offsetY, mmY) : false
  if (!okH || !okV) requestAnimationFrame(redrawRulers)  // retry until layout is ready
}

// watch canvas state changes (pan / zoom)
watch(
  () => [canvasState.value?.scale, canvasState.value?.offsetX, canvasState.value?.offsetY],
  redrawRulers,
)

// ruler ResizeObserver
let rulerResizeObs: ResizeObserver | null = null
onMounted(() => {
  requestAnimationFrame(redrawRulers)   // first draw after layout
  if (typeof ResizeObserver !== 'undefined' && canvasWrapperRef.value) {
    rulerResizeObs = new ResizeObserver(redrawRulers)
    rulerResizeObs.observe(canvasWrapperRef.value)
  }
})
onUnmounted(() => { rulerResizeObs?.disconnect() })

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

// 至少选中 2 个同类元素才能对齐
const canAlign = computed(() => {
  const { selectedIds, selectedType } = mapEditorStore.selection;
  return selectedIds.size >= 2 && (selectedType === 'point' || selectedType === 'location');
});

// 获取元素的画布坐标中心（point 直接用 x/y，location 用顶点质心）
function getElementCenter(id: string, type: string): { x: number; y: number } | null {
  if (type === 'point') {
    const p = mapEditorStore.points.find((pt) => pt.id === id);
    return p ? { x: p.x, y: p.y } : null;
  }
  if (type === 'location') {
    const loc = mapEditorStore.locations.find((l) => l.id === id);
    if (!loc) return null;
    const verts = loc.geometry?.vertices ?? [];
    if (!verts.length) return { x: loc.x ?? 0, y: loc.y ?? 0 };
    const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
    const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
    return { x: cx, y: cy };
  }
  return null;
}

function handleAlign(cmd: string) {
  const { selectedIds, selectedType } = mapEditorStore.selection;
  if (selectedIds.size < 2) { ElMessage.warning('请先选择至少 2 个元素'); return; }

  const ids = Array.from(selectedIds);
  const centers = ids.map((id) => getElementCenter(id, selectedType)).filter(Boolean) as { x: number; y: number }[];

  const xs = centers.map((c) => c.x);
  const ys = centers.map((c) => c.y);
  const refX = cmd === 'left' ? Math.min(...xs) : cmd === 'right' ? Math.max(...xs) : null;
  const refY = cmd === 'top'  ? Math.min(...ys) : cmd === 'bottom' ? Math.max(...ys) : null;

  ids.forEach((id) => {
    const center = getElementCenter(id, selectedType);
    if (!center) return;
    const dx = refX != null ? refX - center.x : 0;
    const dy = refY != null ? refY - center.y : 0;
    if (dx === 0 && dy === 0) return;

    if (selectedType === 'point') {
      const p = mapEditorStore.points.find((pt) => pt.id === id);
      if (!p) return;
      mapEditorStore.updatePoint(id, { x: p.x + dx, y: p.y + dy });
    } else if (selectedType === 'location') {
      const loc = mapEditorStore.locations.find((l) => l.id === id);
      if (!loc) return;
      mapEditorStore.updateLocation(id, {
        geometry: {
          ...loc.geometry,
          vertices: loc.geometry.vertices.map((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
        },
      });
    }
  });
  ElMessage.success('对齐完成');
}

<<<<<<< HEAD
type PathConnectionType = "direct" | "curve";
=======
type PathConnectionType = "direct" | "orthogonal" | "curve";
>>>>>>> origin/master

const currentPathConnectionType = computed<PathConnectionType>(() => {
  const t = mapEditorStore.pathConnectionType as PathConnectionType;
  return t === "direct" || t === "curve" ? t : "direct";
});

const TOOL_TOAST_LABEL: Record<ToolMode, string> = {
  [ToolMode.SELECT]: "选择模式",
  [ToolMode.POINT]: "绘制点模式",
  [ToolMode.PATH]: "路径绘制模式",
  [ToolMode.LOCATION]: "位置绘制模式",
  [ToolMode.PAN]: "漫游模式",
  [ToolMode.ZOOM]: "缩放模式",
  [ToolMode.DASHED_LINK]: "虚线链接模式",
  [ToolMode.RULE_REGION]: "规则区域模式",
};

// 工具切换（改为 toast 提醒）
const setTool = (tool: ToolMode) => {
  if (currentTool.value === tool) return;
  mapEditorStore.setTool(tool);
  ElMessage.info(`已切换到${TOOL_TOAST_LABEL[tool] || "编辑模式"}`);
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
  ElMessage.success("已重置为 1:1");
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
// 点击页面任意位置关闭路径右键菜单
const onDocumentClick = () => {
  if (pathContextMenu.visible) closePathContextMenu();
};

onMounted(async () => {
  document.addEventListener('click', onDocumentClick);
  // 从 localStorage 加载面板宽度
  const savedWidth = localStorage.getItem(LEFT_PANEL_WIDTH_KEY);
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    if (width >= LEFT_PANEL_MIN_WIDTH && width <= LEFT_PANEL_MAX_WIDTH) {
      leftPanelWidth.value = width;
    }
  }

  const savedSidebarOpen = localStorage.getItem(LEFT_SIDEBAR_OPEN_KEY);
  if (savedSidebarOpen !== null) {
    leftSidebarOpen.value = savedSidebarOpen === "1";
  }
  const savedTab = localStorage.getItem(ACTIVE_SIDEBAR_TAB_KEY);
  if (savedTab === "view" || savedTab === "layers") {
    activeSidebarTab.value = savedTab;
  }

  const savedRightCollapsed = localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY);
  if (savedRightCollapsed !== null) {
    isRightPanelCollapsed.value = savedRightCollapsed === "1";
  }
  const savedRightW = localStorage.getItem(RIGHT_PANEL_WIDTH_KEY);
  if (savedRightW) {
    const w = parseInt(savedRightW, 10);
    if (!Number.isNaN(w) && w >= RIGHT_PANEL_MIN_WIDTH && w <= RIGHT_PANEL_MAX_WIDTH) {
      rightPanelWidth.value = w;
    }
  }

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

      // 初始化编辑器状态：默认漫游模式 + 自动选中第一个点
      nextTick(() => {
        mapEditorStore.initEditorState();
      });
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

const extractErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.msg || error?.message || fallback;
};

const collectModelValidationErrors = (): string[] => {
  const errors: string[] = [];
  const points = mapEditorStore.points || [];
  const paths = mapEditorStore.paths || [];
  const locations = mapEditorStore.locations || [];
  const layers = mapEditorStore.layers || [];

  if (points.length === 0) errors.push("当前地图没有点位");
  if (paths.length === 0) errors.push("当前地图没有路径");
  if (locations.length === 0) errors.push("当前地图没有位置");

  const pointIdSet = new Set(
    points.flatMap((p: any) => {
      const ids: string[] = [];
      if (p?.id != null) ids.push(String(p.id));
      if (p?.pointId != null) ids.push(String(p.pointId));
      if (p?.name != null) ids.push(String(p.name));
      return ids;
    }).filter((id: string) => !!id),
  );
  const locationIdSet = new Set(
    locations.flatMap((l: any) => {
      const ids: string[] = [];
      if (l?.id != null) ids.push(String(l.id));
      if (l?.locationId != null) ids.push(String(l.locationId));
      if (l?.name != null) ids.push(String(l.name));
      return ids;
    }).filter((id: string) => !!id),
  );
  const isLocationToken = (token: string) => /^Location-\d+$/i.test(token);
  for (const path of paths) {
    let source = String(path?.startPointId ?? path?.sourcePointId ?? "");
    let dest = String(path?.endPointId ?? path?.destPointId ?? "");
    // 兼容历史数据：部分路径仅在 name 中包含 "Point-xxxx --- Point-yyyy" 或 "Location-xxxx --- Point-yyyy"
    if (!source || !dest) {
      const rawName = String(path?.name ?? "");
      const matches = [...rawName.matchAll(/(?:Point|Location)-\d+/gi)].map((m) => m[0]);
      if (!source && matches[0]) source = matches[0];
      if (!dest && matches[1]) dest = matches[1];
    }
    const sourceExists =
      !!source && (isLocationToken(source) ? locationIdSet.has(source) : pointIdSet.has(source) || locationIdSet.has(source));
    const destExists =
      !!dest && (isLocationToken(dest) ? locationIdSet.has(dest) : pointIdSet.has(dest) || locationIdSet.has(dest));
    if (!sourceExists) {
      errors.push(`路径起点不存在（${path?.name || path?.id || "未命名路径"}）`);
    }
    if (!destExists) {
      errors.push(`路径终点不存在（${path?.name || path?.id || "未命名路径"}）`);
    }
  }

  const layerIdSet = new Set(layers.map((l: any) => String(l?.id ?? "")));
  for (const point of points) {
    if (point?.layerId != null && !layerIdSet.has(String(point.layerId))) {
      errors.push(`点位引用了无效图层（${point?.name || point?.id || "未命名点位"}）`);
    }
  }
  for (const path of paths) {
    if (path?.layerId != null && !layerIdSet.has(String(path.layerId))) {
      errors.push(`路径引用了无效图层（${path?.name || path?.id || "未命名路径"}）`);
    }
  }
  for (const location of locations) {
    if (location?.layerId != null && !layerIdSet.has(String(location.layerId))) {
      errors.push(`位置引用了无效图层（${location?.name || location?.id || "未命名位置"}）`);
    }
  }

  return errors;
};

const validateBeforePublish = (): string | null => {
  const errors = collectModelValidationErrors();
  if (errors.length === 0) return null;
  return `发布前校验失败：${errors[0]}`;
};

const showValidationErrorSummary = (errors: string[], title: string) => {
  const maxItems = 6;
  const display = errors.slice(0, maxItems).map((e) => `- ${e}`).join("\n");
  const omitted = errors.length > maxItems ? `\n- ... 还有 ${errors.length - maxItems} 个问题` : "";
  ElMessageBox.alert(`${display}${omitted}`, title, {
    confirmButtonText: "我知道了",
    type: "warning",
  });
};

// 导入底图
const handleImportBaseLayer = () => {
  importBaseLayerDialogRef.value?.open();
};

// 处理底图导入事件
const handleBaseLayerImport = async (data: {
  yamlFile: File;
  pgmFile: File;
  yamlInfo: {
    resolution: number;
    origin: number[];
    width: number;
    height: number;
    imageName: string;
  };
}) => {
  try {
    ElMessage.info('正在处理底图...');

    // 1. 将 PGM 转换为图片 Data URL
    const pgmArrayBuffer = await data.pgmFile.arrayBuffer();
    const pgmResult = await parsePgmToDataUrl(pgmArrayBuffer);

    // 2. 上传到 OSS（PGM 转成的 PNG）
    const pngDataUrl = pgmResult.dataUrl;
    const pngBase64 = pngDataUrl.split(',')[1];
    const pngBinary = atob(pngBase64);
    const pngArray = new Uint8Array(pngBinary.length);
    for (let i = 0; i < pngBinary.length; i++) {
      pngArray[i] = pngBinary.charCodeAt(i);
    }
    const pngBlob = new Blob([pngArray], { type: 'image/png' });
    const pngFile = new File([pngBlob], `${data.yamlInfo.imageName.replace('.pgm', '')}.png`, { type: 'image/png' });

    // 上传 PGM 图片
    const pgmUploadResult = await uploadOss(pngFile);

    // 3. 上传 YAML 文件
    const yamlUploadResult = await uploadOss(data.yamlFile);

    // 4. Layout 比例尺与 yaml 一致：mm/单位 = resolution × 1000（此时 1 像素 ≈ 1 模型单位）
    const scaleMm = data.yamlInfo.resolution * 1000;
    if (mapEditorStore.mapData?.visualLayout) {
      mapEditorStore.mapData.visualLayout.scaleX = scaleMm;
      mapEditorStore.mapData.visualLayout.scaleY = scaleMm;
    }
    if (mapEditorStore.mapData?.mapInfo) {
      mapEditorStore.mapData.mapInfo.scaleX = scaleMm;
      mapEditorStore.mapData.mapInfo.scaleY = scaleMm;
    }

    const rasterBackground: RasterBackground = {
      imageDataUrl: pgmResult.dataUrl,
      originX: data.yamlInfo.origin[0],
      originY: data.yamlInfo.origin[1],
      resolution: data.yamlInfo.resolution,
      widthPx: pgmResult.width,
      heightPx: pgmResult.height,
    };

    const cw = mapEditorStore.canvasState.width || 1920;
    const ch = mapEditorStore.canvasState.height || 1080;
    const { offsetX: viewOx, offsetY: viewOy } = viewportOffsetForModelOrigin(
      cw,
      ch,
    );

    mapEditorStore.setRasterBackground(rasterBackground);
    mapEditorStore.updateCanvasState({
      scale: 1,
      offsetX: viewOx,
      offsetY: viewOy,
      width: cw,
      height: ch,
    });

    // 8. 保存到底图元数据：需要有效的导航地图 ID
    const rawDbId = mapEditorStore.mapData?.mapInfo?.id;
    const dbId = rawDbId != null ? Number(rawDbId) : NaN;
    if (Number.isFinite(dbId)) {
      const yamlOrigin = JSON.stringify(data.yamlInfo.origin);
      const mapOrigin = JSON.stringify([0, 0, data.yamlInfo.origin[2] || 0]);

      await updateNavigationMap({
        id: dbId,
        rasterUrl: pgmUploadResult.data.url,
        rasterVersion: 1,
        rasterWidth: pgmResult.width,
        rasterHeight: pgmResult.height,
        rasterResolution: data.yamlInfo.resolution,
        yamlOrigin: yamlOrigin,
        yamlUrl: yamlUploadResult.data.url,
        mapOrigin: mapOrigin,
      } as any);
    } else {
      console.error(
        "[ImportBaseLayer] 无法更新导航地图：mapInfo.id 为空或无效",
        rawDbId,
      );
      ElMessage.warning(
        "底图已导入当前会话，但地图ID无效，未写入数据库（请重新打开地图后再导入）",
      );
    }

    ElMessage.success('底图导入成功');
  } catch (error) {
    console.error('导入底图失败:', error);
    ElMessage.error('导入底图失败');
  }
};

// 发布地图
const handlePublish = async () => {
  try {
    const mapId = mapEditorStore.currentMapId;
    if (!mapId) {
      ElMessage.error("地图 mapId 不存在");
      return;
    }
    const precheckError = validateBeforePublish();
    if (precheckError) {
      ElMessage.warning(precheckError);
      return;
    }
    await ElMessageBox.confirm(
      "发布后该地图将生效，确定要发布吗？",
      "发布确认",
      {
        confirmButtonText: "确定发布",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    publishLoading.value = true;
    await publishMap(mapId);

    // 更新本地状态
    if (mapEditorStore.mapData?.mapInfo) {
      mapEditorStore.mapData.mapInfo.status = "1";
    }

    ElMessage.success("发布成功");
  } catch (error: any) {
    if (error !== "cancel") {
      const errorMessage = extractErrorMessage(error, "发布失败");
      if (errorMessage.includes("发布失败：")) {
        ElMessage.error(errorMessage);
      } else {
        ElMessage.error("发布失败：" + errorMessage);
      }
      console.error("发布错误详情:", error);
    }
  } finally {
    publishLoading.value = false;
  }
};

// 保存
const handleSave = async () => {
  const validationErrors = collectModelValidationErrors();
  if (validationErrors.length > 0) {
    showValidationErrorSummary(validationErrors, "保存前校验未通过");
    return;
  }
  try {
    await mapEditorStore.saveMap();
    ElMessage.success("保存成功");
    // 通知父组件地图已更新
    const mapName =
      mapEditorStore.mapData?.mapInfo?.name || props.mapName || "未命名";
    emit("map-updated", mapName);
  } catch (error: any) {
    const errorMessage = extractErrorMessage(error, "保存失败");
    if (errorMessage.includes("保存冲突")) {
      try {
        await ElMessageBox.confirm(
          `${errorMessage}\n是否立即刷新到最新版本？未保存修改可能会丢失。`,
          "版本冲突",
          {
            confirmButtonText: "立即刷新",
            cancelButtonText: "稍后处理",
            type: "warning",
          },
        );
        const currentMapId = mapEditorStore.currentMapId;
        if (currentMapId) {
          await mapEditorStore.loadMap(currentMapId);
          ElMessage.success("已刷新到最新地图版本");
        } else {
          ElMessage.warning("当前地图标识缺失，请返回列表后重新进入");
        }
      } catch (confirmError) {
        // 用户选择稍后处理
      }
    } else if (errorMessage.includes("mapId")) {
      ElMessage.error("保存失败：地图标识异常，请重新进入编辑器");
    } else {
      ElMessage.error("保存失败：" + errorMessage);
    }
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
  const mapId = mapEditorStore.currentMapId;
  if (!mapId) {
    ElMessage.warning("当前没有可导出的地图模型");
    return;
  }
  try {
    const blob = await exportMapFile(mapId);
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

    const scaleMm = parsed.resolution * 1000;
    if (mapEditorStore.mapData?.visualLayout) {
      mapEditorStore.mapData.visualLayout.scaleX = scaleMm;
      mapEditorStore.mapData.visualLayout.scaleY = scaleMm;
    }
    if (mapEditorStore.mapData?.mapInfo) {
      mapEditorStore.mapData.mapInfo.scaleX = scaleMm;
      mapEditorStore.mapData.mapInfo.scaleY = scaleMm;
    }
    const cw = mapEditorStore.canvasState.width || 1920;
    const ch = mapEditorStore.canvasState.height || 1080;
    const { offsetX: vox, offsetY: voy } = viewportOffsetForModelOrigin(cw, ch);

    const payload: RasterBackground = {
      imageDataUrl: dataUrl,
      originX: parsed.originX,
      originY: parsed.originY,
      resolution: parsed.resolution,
      widthPx: width,
      heightPx: height,
    };
    mapEditorStore.setRasterBackground(payload);
    mapEditorStore.updateCanvasState({
      scale: 1,
      offsetX: vox,
      offsetY: voy,
      width: cw,
      height: ch,
    });
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
  if (!raster || !mapEditorStore.mapData) return;

  const scaleMm = resolveScaleMmPerUnitForRaster({
    mapInfo: mapEditorStore.mapData.mapInfo,
    visualLayout: mapEditorStore.mapData.visualLayout,
    rasterResolutionMPerPx: raster.resolution || 0.05,
  });
  const layout = computeRasterModelLayout({
    originXm: raster.originX,
    originYm: raster.originY,
    resolutionMPerPx: raster.resolution,
    widthPx: raster.widthPx,
    heightPx: raster.heightPx,
    scaleMmPerUnit: scaleMm,
  });
  const cx = layout.x + layout.widthModel / 2;
  const cy = layout.y + layout.heightModel / 2;

  const canvasState = mapEditorStore.canvasState || {
    width: 1920,
    height: 1080,
    scale: 1,
  };
  const s = canvasState.scale || 1;
  mapEditorStore.updateCanvasState({
    offsetX: (canvasState.width || 1920) / 2 - cx * s,
    offsetY: (canvasState.height || 1080) / 2 - cy * s,
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

  // Ctrl+B 切换左侧视图/图层面板展开
  if (e.ctrlKey && !e.shiftKey && (e.key === "b" || e.key === "B")) {
    e.preventDefault();
    leftSidebarOpen.value = !leftSidebarOpen.value;
    persistSidebarPrefs();
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
  document.removeEventListener('click', onDocumentClick);
  // 移除键盘事件
  window.removeEventListener("keydown", handleKeyDown);

  // 清理拖拽事件
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
  document.removeEventListener("mousemove", handleRightResizeMove);
  document.removeEventListener("mouseup", handleRightResizeEnd);
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
    min-height: 36px;
    flex-shrink: 0;
    background: linear-gradient(0deg, #fafbfc 0%, #fff 100%);
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    row-gap: 4px;
    column-gap: 8px;
    padding: 2px 8px;
    z-index: 100;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      row-gap: 4px;
      min-width: 0;

      &.toolbar-left-cluster {
        gap: 4px;
      }

      .toolbar-cluster-divider {
        flex-shrink: 0;
      }

      .toolbar-align-dropdown {
        display: inline-flex;
        align-items: center;
      }

      .toolbar-align-icon {
        color: currentColor;
      }

      .align-menu-icon {
        display: inline-block;
        width: 1.2em;
        text-align: center;
        font-size: 14px;
        margin-right: 2px;
      }

      .pan-hand-icon {
        width: 1em;
        height: 1em;
        display: block;
      }

      .select-pointer-icon {
        width: 1em;
        height: 1em;
        display: block;
      }

      :deep(.el-divider--vertical) {
        height: 30px;
        margin: 0 4px;
        align-self: center;
        border-left-color: #e0e3eb;
      }

      .el-button-group.creation-tool-group {
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
        width: 36px !important;
        min-width: 36px;
        height: 36px !important;
        min-height: 36px;
        padding: 0 !important;
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
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0;
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
          display: none;
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

        .block-toolbar-icon {
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

      // 不使用 flex order：保持模板顺序为 选择/漫游→点→位置→直线/直角/曲线路径→虚线链接→撤销等
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

    .map-editor-activity-bar {
      width: 44px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      gap: 4px;
      background: #f0f2f5;
      border-right: 1px solid #e4e7ed;
      z-index: 20;

      .activity-bar-spacer {
        flex: 1;
        min-height: 8px;
      }

      .activity-bar-item {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #606266;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          background 0.15s,
          color 0.15s;

        &:hover {
          background: rgba(64, 158, 255, 0.12);
          color: #409eff;
        }

        &.is-active {
          background: rgba(64, 158, 255, 0.18);
          color: #409eff;
        }

        .activity-bar-icon-img {
          width: 20px;
          height: 20px;
          display: block;
          object-fit: contain;
          opacity: 0.85;
        }

        &.is-active .activity-bar-icon-img {
          opacity: 1;
        }
      }
    }

    // 可折叠侧栏（视图 | 图层）
    .left-panels {
      background: #fff;
      border-right: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      min-width: 0;

      .sidebar-panel-container {
        flex: 1;
        min-height: 0;
        border-bottom: none;
      }

      .sidebar-panel-header {
        cursor: default;
      }

      .panel-container {
        display: flex;
        flex-direction: column;
        min-height: 0;

        .panel-header {
          height: 32px;
          padding: 0 12px;
          background: #fff;
          border-bottom: 1px solid #e4e7ed;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          user-select: none;
          flex-shrink: 0;

          .panel-title,
          .canval-title,
          .canvas-title {
            font-size: 12px;
            color: #606266;
            line-height: 1;
            font-weight: 500;
          }
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
        }

        .panel-content--sidebar-fill {
          min-height: 0;
          display: flex;
          flex-direction: column;
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

    // 画布区域
    .canvas-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
      position: relative;

      // 标尺顶行
      .ruler-top-row {
        display: flex;
        flex-shrink: 0;
        height: 20px;
        background: #f7f8fa;
        border-bottom: 1px solid #ddd;

        .ruler-corner {
          width: 24px;
          flex-shrink: 0;
          background: #f7f8fa;
          border-right: 1px solid #ddd;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;

          .ruler-unit {
            font-size: 9px;
            color: #888;
            font-family: Arial, system-ui, sans-serif;
            line-height: 1;
          }
        }

        .ruler-h-canvas {
          flex: 1;
          height: 20px;
          display: block;
          min-width: 0;
        }
      }

      // 内容行：垂直标尺 + 画布
      .canvas-body-row {
        flex: 1;
        display: flex;
        min-height: 0;
        overflow: hidden;

        .ruler-v-canvas {
          width: 24px;
          flex-shrink: 0;
          display: block;
          background: #f7f8fa;
          border-right: 1px solid #ddd;
        }
      }

      .canvas-wrapper {
        flex: 1;
        position: relative;
        min-height: 0;
        min-width: 0;

        :deep(.map-canvas-container) {
          width: 100%;
          height: 100%;
        }
      }

      .ruler-info-box {
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 6;
        pointer-events: none;
        user-select: none;
        background: rgba(247, 248, 250, 0.92);
        border: 1px solid #ddd;
        border-radius: 3px;
        padding: 3px 6px;
        line-height: 1.7;

        .rib-scale {
          font-size: 11px;
          font-weight: 600;
          color: #303133;
        }

        .rib-coord {
          font-size: 10px;
          color: #666;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
      }

      .canvas-floating-controls {
        position: absolute;
        right: 14px;
        bottom: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        z-index: 11;

        .floating-slot {
          width: 36px;
          display: flex;
          justify-content: center;
        }

        .floating-btn {
          width: 36px;
          height: 36px;
          min-width: 36px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #dcdfe6;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

          &.is-active {
            border-color: #3388ff;
            color: #3388ff;
          }

          &.floating-btn--layer {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }

        .floating-layer-icon {
          width: 18px;
          height: 18px;
          display: block;
          object-fit: contain;
        }

        .mono-btn {
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0;
        }
      }
    }

    .canvas-footer {
      position: absolute;
      left: 14px;
      bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      z-index: 12;

      .muted {
        color: #909399;
      }

      .footer-sep {
        color: #dcdfe6;
      }

      .mono {
        font-family: monospace;
        color: #606266;
      }

      .zoom-indicator {
        color: #409eff;
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .right-panel {
      background: #fff;
      border-left: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
      min-width: 0;

      .panel-header {
        height: 32px;
        padding: 0 12px;
        background: #fff;
        border-bottom: 1px solid #e4e7ed;
        box-sizing: border-box;

        .canvas-title {
          font-size: 12px;
          color: #606266;
          font-weight: 500;
        }
      }

      .right-panel-header {
        cursor: default;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-right: 4px;

        .right-panel-collapse-btn {
          border: none;
          background: transparent;
          padding: 4px;
          border-radius: 4px;
          color: #909399;
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: #f5f7fa;
            color: #409eff;
          }
        }
      }

      .right-panel-tabs {
        display: flex;
        flex-shrink: 0;
        border-bottom: 1px solid #e4e7ed;
        background: #fafafa;
        padding: 0 8px;
        gap: 2px;
      }

      .right-tab-btn {
        padding: 8px 14px;
        font-size: 13px;
        color: #606266;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        line-height: 1;
        transition: color 0.15s, border-color 0.15s;
        margin-bottom: -1px;

        &:hover {
          color: #409eff;
        }

        &.is-active {
          color: #409eff;
          border-bottom-color: #409eff;
          font-weight: 500;
        }
      }

      .right-panel-body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;

        :deep(.property-panel) {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        :deep(.property-panel .panel-content) {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
      }
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

.layer-toolbar-svg {
  width: 20px;
  height: 20px;
  display: block;
  object-fit: contain;
}

.layer-visibility-menu {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  min-width: 200px;
}

.layer-visibility-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  transition: background 0.15s ease;

  &:hover {
    background: #f5f7fa;
  }

  .layer-visibility-menu__icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .layer-visibility-menu__text {
    line-height: 1.35;
  }

  &:not(.is-off) {
    .layer-visibility-menu__icon,
    .layer-visibility-menu__text {
      color: #3388ff;
    }
  }

  &.is-off {
    .layer-visibility-menu__icon,
    .layer-visibility-menu__text {
      color: #a0a0a0;
    }

    .layer-visibility-menu__text {
      text-decoration: line-through;
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

<style lang="scss">
// 路径右键菜单（不使用 scoped，避免动态渲染时类名哈希失效）
.path-context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  min-width: 140px;
  padding: 4px 0;
  user-select: none;

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    font-size: 13px;
    color: #303133;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #f5f7fa;
    }

    &--danger {
      color: #f56c6c;
    }
  }

  &__divider {
    height: 1px;
    background: #e4e7ed;
    margin: 4px 0;
  }
}
</style>
