# 保险方案选择可编辑结果表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保险方案比较页面提供点击展开的、结果列可编辑的方案选择表。

**Architecture:** `InsurancePanel.vue` 持有结果表的显示状态与五个字段的本地响应式状态。模板仅在用户点击按钮后渲染表格；现有保险计算与下载逻辑保持不动。

**Tech Stack:** Vue 3 `<script setup>`、Node.js 内置测试运行器、Vite。

## Global Constraints

- 保留用户已有的未提交修改和既有工作簿文件变动。
- 默认只显示按钮；点击后在当前页面显示表格。
- 仅结果列可编辑，且编辑值仅保存在当前组件会话。
- 不新增依赖，不改变现有评分逻辑、报价表或下载链接。

---

### Task 1: 可编辑方案选择表

**Files:**
- Modify: `yuhong-finance/src/components/panels/InsurancePanel.vue:1-118`
- Modify: `yuhong-finance/tests/task-content.test.js:1-154`

**Interfaces:**
- Consumes: 现有 `InsurancePanel.vue` 的 `PanelShell`、下载链接和保险报价数据。
- Produces: `showDecision`（布尔显示状态）与 `decision`（`company`、`score`、`premium`、`fundingSource`、`conclusion` 字段），仅由页面模板使用。

- [ ] **Step 1: 写入会失败的源码结构测试**

在 `tests/task-content.test.js` 末尾增加：

```js
test('保险方案选择按钮展开可编辑结果表', () => {
  const source = readFileSync(new URL('../src/components/panels/InsurancePanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const showDecision = ref\(false\)/)
  assert.match(source, /@click="showDecision = true"/)
  assert.match(source, /v-if="showDecision"/)
  assert.match(source, /v-model="decision\.company"/)
  assert.match(source, /v-model="decision\.score"/)
  assert.match(source, /v-model="decision\.premium"/)
  assert.match(source, /v-model="decision\.fundingSource"/)
  assert.match(source, /v-model="decision\.conclusion"/)
  assert.match(source, /class="decision-input editable"/)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/task-content.test.js`

Expected: FAIL，断言找不到 `showDecision`，证明测试覆盖新增交互。

- [ ] **Step 3: 实现最小页面状态、按钮和表格**

在 `InsurancePanel.vue` 导入 `ref`，并加入：

```js
const showDecision = ref(false)
const decision = ref({
  company: 'B保险公司',
  score: '77.79',
  premium: '11000',
  fundingSource: '政府财政拨款保障资金',
  conclusion: '选择B保险公司：综合得分最高77.79分，洪涝救援明确承保、免赔额最低、赔付时效最快，且保障额度与承保范围投入较为均衡。',
})
```

在“标准分计算规则”区块之后、下载链接之前添加按钮及 `v-if="showDecision"` 的两列表格：项目列固定，结果列按顺序使用四个 `<input v-model="decision.*">` 和一个 `<textarea v-model="decision.conclusion">`。将结果控件使用 `decision-input editable` 类，表格使用现有 `calc-table` 类，并在组件末尾添加小范围 CSS，使可编辑列为浅蓝色、文本域可读。

- [ ] **Step 4: 运行新增测试确认通过**

Run: `npm test -- tests/task-content.test.js`

Expected: PASS，所有该文件测试通过。

- [ ] **Step 5: 运行完整验证**

Run: `npm test && npm run build`

Expected: 两个命令均以退出码 0 完成。

- [ ] **Step 6: 仅提交本任务文件**

```bash
git add yuhong-finance/src/components/panels/InsurancePanel.vue yuhong-finance/tests/task-content.test.js
git commit -m "feat: add editable insurance decision table"
```
