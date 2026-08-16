# 资金类别属性精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除被划掉的资金使用属性，仅保留默认勾选的“是否限定用途”。

**Architecture:** 仅修改 `LedgerPanel.vue` 的资金类别页面状态、校验和模板，并在既有 Node 测试中对该页面源码的关键内容建立回归断言。页面上方资金来源标签和用途强制校验区维持现有行为。

**Tech Stack:** Vue 3、Vite、Node.js 内置测试运行器。

## Global Constraints

- 保留用户已有的无关未提交修改。
- 不新增依赖。
- 默认和重置后的 `fundAttrs.limitedUse` 均为 `true`。

---

### Task 1: 回归测试与资金类别页面精简

**Files:**
- Modify: `yuhong-finance/tests/task-content.test.js`
- Modify: `yuhong-finance/src/components/panels/LedgerPanel.vue:71-101, 199-207, 324-383`

**Interfaces:**
- Consumes: `fundAttrs.limitedUse` 布尔响应式状态。
- Produces: 只包含限定用途控制与保留资金来源校验的资金类别表单。

- [ ] **Step 1: 写入失败测试**

在 `tests/task-content.test.js` 中读取 `LedgerPanel.vue` 后加入：

```js
test('资金类别页面只保留默认勾选的限定用途属性', () => {
  const source = readFileSync(ledgerPanelPath, 'utf8')
  assert.match(source, /limitedUse: true/)
  assert.match(source, /<input v-model="fundAttrs\.limitedUse" type="checkbox" \/>是否限定用途/)
  assert.doesNotMatch(source, /limitedGrids|限定使用网格|arrivalTime|payableTime|balance/)
  assert.doesNotMatch(source, /限定物资类别|limitedMaterials|MATERIAL_OPTIONS/)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/task-content.test.js`

Expected: FAIL，因为页面仍包含划掉字段。

- [ ] **Step 3: 最小化实现**

从 `LedgerPanel.vue` 删除物资选项常量、物资相关响应式状态和计算属性；删除保存校验、重置逻辑、模板和成功摘要中的网格、物资及三个时间/金额字段；保留并默认勾选 `fundAttrs.limitedUse`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/task-content.test.js`

Expected: PASS。

- [ ] **Step 5: 运行完整验证**

Run: `npm test && npm run build`

Expected: 所有测试通过且 Vite 生产构建完成。

- [ ] **Step 6: 提交**

```bash
git add yuhong-finance/src/components/panels/LedgerPanel.vue yuhong-finance/tests/task-content.test.js
git commit -m "fix: simplify fund category attributes"
```