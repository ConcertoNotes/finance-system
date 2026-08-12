# 御洪智策洪涝应急财经决策平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建覆盖 Excel 全部岗位、任务和数据的 Vue 双模式洪涝应急财经决策平台。

**Architecture:** 采用 Vue 3 + Vite 单页应用，页面导航由应用状态驱动，业务计算集中在纯函数模块，静态业务数据按领域拆分。驾驶舱和阶段演练读取同一数据源，岗位注册表支持 localStorage 扩展。

**Tech Stack:** Vue 3、Vite、Lucide Vue Next、Node.js 内置测试、Playwright CLI、CSS、原生 SVG 图表。

## Global Constraints

- 所有 Excel 描述均映射到页面、配置或演练任务，不省略岗位和任务。
- 不使用数据库；数据直接嵌入前端模块。
- 不引入图表库，图表使用 CSS 或原生 SVG，按钮图标使用 Lucide。
- 视觉适配 1440×900、1280×720 与 390×844。
- 新增岗位通过配置接口和 localStorage 扩展。

---

### Task 1: 工程骨架与需求完整性测试

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `tests/content-integrity.test.js`
- Create: `src/data/roles.js`
- Create: `src/data/rehearsal.js`

**Interfaces:**
- Produces: `defaultRoles`, `assistantRole`, `rehearsalTasks`。

- [ ] **Step 1: 编写失败测试**，断言四个岗位、数字人御洪星和任务 1 至任务 8 全部存在。
- [ ] **Step 2: 运行 `npm test`**，确认因数据模块缺失而失败。
- [ ] **Step 3: 创建 Vite 工程配置和岗位、任务数据模块**，每个任务包含 `id/title/role/summary/steps/metrics`。
- [ ] **Step 4: 再次运行 `npm test`**，确认内容完整性测试通过。

### Task 2: 财经领域数据与计算

**Files:**
- Create: `tests/finance.test.js`
- Create: `src/data/disaster.js`
- Create: `src/data/budget.js`
- Create: `src/data/procurement.js`
- Create: `src/data/funds.js`
- Create: `src/domain/finance.js`
- Create: `src/domain/emergency.js`

**Interfaces:**
- Produces: `getGridSnapshot(stage)`、`summarizeDisaster(grids)`、`determineResponse(metrics)`、`calculateInsuranceScores(products, weights)`、`getBudgetScenario(id)`。

- [ ] **Step 1: 编写灾情、判级、预算和保险的失败测试**，断言初始转移 7,000、升级转移 8,100、初始 III 级、升级 II 级、B/C 差额 1,366,087、保险II得分 74.45。
- [ ] **Step 2: 运行 `npm test`**，确认函数缺失导致预期失败。
- [ ] **Step 3: 实现数据与纯函数**，使用 Excel 中的阈值、参数和标准化公式。
- [ ] **Step 4: 运行 `npm test`**，确认所有财经计算通过。

### Task 3: 应用壳层、视觉系统与公共组件

**Files:**
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/styles/index.css`
- Create: `src/components/AppSidebar.vue`
- Create: `src/components/AppHeader.vue`
- Create: `src/components/MetricCard.vue`
- Create: `src/components/StatusBadge.vue`
- Create: `src/components/BaseModal.vue`
- Create: `src/components/ToastStack.vue`
- Create: `src/components/AssistantPanel.vue`
- Create: `src/components/MiniLineChart.vue`
- Create: `src/components/GridHeatmap.vue`
- Create: `public/flood-grid-texture.png`

**Interfaces:**
- Consumes: 岗位注册表和灾情快照。
- Produces: 8 个导航入口、全局场景状态、岗位状态、弹层和通知接口。

- [ ] **Step 1: 扩展完整性测试**，检查 8 个导航标识和全部公共组件文件。
- [ ] **Step 2: 运行 `npm test`**，确认应用壳层尚未创建而失败。
- [ ] **Step 3: 生成低对比度洪涝网格纹理 PNG**，实现响应式应用壳层、侧边栏、顶部栏和公共组件。
- [ ] **Step 4: 运行 `npm test` 与 `npm run build`**，确认壳层可编译。

### Task 4: 驾驶舱、灾情数据与预算页面

**Files:**
- Create: `src/views/DashboardView.vue`
- Create: `src/views/DataCenterView.vue`
- Create: `src/views/BudgetView.vue`

**Interfaces:**
- Consumes: 全局 `stage`、灾情汇总、预算方案和响应判级。
- Produces: 网格详情选择、数据采集模拟、A/B/C 方案切换和预算参数展示。

- [ ] **Step 1: 扩展内容测试**，检查驾驶舱五部分标题、四个数据源、三种预算方案和判级指标。
- [ ] **Step 2: 运行 `npm test`**，确认页面内容缺失而失败。
- [ ] **Step 3: 实现三个页面**，升级态必须同步甲3/甲6、道路中断、预算、等级和资金指标。
- [ ] **Step 4: 运行 `npm test` 与 `npm run build`**，确认页面可编译且内容覆盖通过。

### Task 5: 采购、保险、资金与协同页面

**Files:**
- Create: `src/views/ProcurementView.vue`
- Create: `src/views/FundsView.vue`
- Create: `src/views/CollaborationView.vue`

**Interfaces:**
- Consumes: 保险评分、采购风险、资金状态和岗位注册表。
- Produces: 保险权重调整、推荐结果、采购锁价、账套链路和岗位筛选。

- [ ] **Step 1: 扩展内容测试**，检查三款保险、八项权重、四个账套科目和四岗位协同记录。
- [ ] **Step 2: 运行 `npm test`**，确认页面内容缺失而失败。
- [ ] **Step 3: 实现三个页面**，所有操作提供可见反馈，保险权重变化实时重算。
- [ ] **Step 4: 运行 `npm test` 与 `npm run build`**，确认结果稳定。

### Task 6: 阶段演练与岗位扩展

**Files:**
- Create: `tests/role-registry.test.js`
- Create: `src/domain/roleRegistry.js`
- Create: `src/views/RehearsalView.vue`
- Create: `src/views/SettingsView.vue`

**Interfaces:**
- Produces: `loadCustomRoles(storage)`、`saveCustomRoles(storage, roles)`、`validateNewRole(role, existing)`、演练完成状态。

- [ ] **Step 1: 编写角色扩展失败测试**，覆盖合法新增、重名、损坏存储回退和持久化。
- [ ] **Step 2: 运行 `npm test`**，确认角色注册函数缺失而失败。
- [ ] **Step 3: 实现角色注册函数、八任务演练页和系统配置页**。
- [ ] **Step 4: 运行 `npm test` 与 `npm run build`**，确认岗位扩展和演练内容通过。

### Task 7: 浏览器验收与视觉修复

**Files:**
- Modify: 仅修改验收中发现问题的 Vue 或 CSS 文件。
- Create: `output/playwright/` 下的桌面和手机截图。

**Interfaces:**
- Verifies: 真实页面导航、场景切换、预算切换、保险推荐、演练推进、新增岗位和响应式布局。

- [ ] **Step 1: 启动 Vite 开发服务器**，记录实际端口。
- [ ] **Step 2: 使用 Playwright CLI 在 1440×900 和 390×844 下截图并执行核心交互**。
- [ ] **Step 3: 检查控制台、文字裁切、组件重叠、空白区域和资产渲染，修复发现的问题**。
- [ ] **Step 4: 重新运行 `npm test`、`npm run build` 和 Playwright 核心流程**，保存最终证据。

