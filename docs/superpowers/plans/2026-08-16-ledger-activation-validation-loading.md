# 账套启用校验加载反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为专项账套的启用校验按钮提供 3 秒加载反馈，并在加载结束后保留原有的校验结果行为。

**Architecture:** 在 `LedgerPanel.vue` 内维护单一 `isLedgerValidating` 响应式状态，并由 `startLedgerActivationValidation` 统一管理延迟、重复点击保护和现有 `save` 调用。模板根据该状态切换按钮文案、禁用属性及旋转图标；仅在该组件的局部样式中定义图标动画。

**Tech Stack:** Vue 3 Composition API、Vite、Node.js 内置测试运行器（`node:test`）。

## Global Constraints

- 仅修改专项账套的 `ledger-activate` 页面，不改变其他任务流程、校验规则或持久化结构。
- 加载状态持续 3000 ms；按钮显示旋转圈与“校验中…”，并禁用重复点击。
- 无论校验通过还是因前置页面未完成而失败，都须在计时结束后才调用既有校验逻辑并恢复按钮。
- 不引入依赖。

---

### Task 1: 为加载状态补充回归测试

**Files:**
- Modify: `yuhong-finance/tests/task-content.test.js`

**Interfaces:**
- Consumes: `LedgerPanel.vue` 中的 `isLedgerValidating`、`startLedgerActivationValidation` 和 `ledger-activate` 模板。
- Produces: 对加载状态、按钮禁用、3 秒延迟及既有 `save` 调用的静态回归覆盖。

- [ ] **Step 1: 写入失败的回归测试**

在 `task-content.test.js` 中，紧随“资金类别页面保留工作簿规定的六项资金使用属性”测试后添加：

```js
test('账套启用校验按钮会显示三秒加载状态后再执行既有校验', () => {
  const source = readFileSync(new URL('../src/components/panels/LedgerPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /const isLedgerValidating = ref\(false\)/)
  assert.match(source, /function startLedgerActivationValidation\(\) \{/)
  assert.match(source, /if \(isLedgerValidating\.value\) return/)
  assert.match(source, /isLedgerValidating\.value = true/)
  assert.match(source, /setTimeout\(\(\) => \{/)
  assert.match(source, /\}, 3000\)/)
  assert.match(source, /save\('ledger-activate', \(\) => \(pendingPages\.length/)
  assert.match(source, /isLedgerValidating\.value = false/)
  assert.match(source, /:disabled="isLedgerValidating"/)
  assert.match(source, /v-if="isLedgerValidating"/)
  assert.match(source, /校验中…/)
  assert.match(source, /class="button-spinner"/)
})
```

- [ ] **Step 2: 运行测试，确认因新交互尚未实现而失败**

Run: `npm test -- task-content.test.js`

Expected: 新增“账套启用校验按钮会显示三秒加载状态后再执行既有校验”测试失败，缺少 `isLedgerValidating`。

- [ ] **Step 3: 暂不修改生产代码**

保留失败测试，进入 Task 2 实现最小改动。

### Task 2: 实现加载交互与局部动画样式

**Files:**
- Modify: `yuhong-finance/src/components/panels/LedgerPanel.vue:67-69`
- Modify: `yuhong-finance/src/components/panels/LedgerPanel.vue:174-184`
- Modify: `yuhong-finance/src/components/panels/LedgerPanel.vue:503-510`
- Modify: `yuhong-finance/src/components/panels/LedgerPanel.vue`（新增组件局部 `<style scoped>` 块）

**Interfaces:**
- Consumes: 现有 `pendingPages` 计算属性及 `save(id, check)` 函数。
- Produces: `isLedgerValidating: Ref<boolean>` 与 `startLedgerActivationValidation(): void`，供账套启用按钮绑定。

- [ ] **Step 1: 新增加载状态与处理函数**

在现有 `const activeId = ref('')` 和 `const error = ref('')` 之后添加状态：

```js
const isLedgerValidating = ref(false)
```

在 `save` 函数之后添加处理函数：

```js
function startLedgerActivationValidation() {
  if (isLedgerValidating.value) return

  isLedgerValidating.value = true
  setTimeout(() => {
    save('ledger-activate', () => (pendingPages.length ? `还有 ${pendingPages.length} 个功能页未办理，无法通过校验` : ''))
    isLedgerValidating.value = false
  }, 3000)
}
```

- [ ] **Step 2: 将账套启用按钮绑定为加载态 UI**

将 `ledger-activate` 模板中现有的单行按钮替换为：

```vue
<button type="button" class="primary-button" :disabled="isLedgerValidating" @click="startLedgerActivationValidation">
  <span v-if="isLedgerValidating" class="button-spinner" aria-hidden="true"></span>
  {{ isLedgerValidating ? '校验中…' : '校验测试并正式启用' }}
</button>
```

- [ ] **Step 3: 添加局部旋转图标样式**

在文件末尾新增：

```vue
<style scoped>
.button-spinner {
  width: 14px;
  height: 14px;
  margin-right: 6px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ledger-validation-spin 0.8s linear infinite;
}

@keyframes ledger-validation-spin {
  to { transform: rotate(360deg); }
}
</style>
```

- [ ] **Step 4: 运行针对性测试，确认通过**

Run: `npm test -- task-content.test.js`

Expected: 全部 `task-content.test.js` 测试通过，包括新增的账套启用加载反馈测试。

- [ ] **Step 5: 运行全量测试与生产构建**

Run: `npm test && npm run build`

Expected: 测试通过，Vite 生产构建退出码为 0。

- [ ] **Step 6: 进行实际页面验证**

Run: `npm run dev -- --host 127.0.0.1`

在浏览器中打开专项账套启用页面，完成或恢复前置步骤后点击“校验测试并正式启用”。确认点击后按钮立即变为“校验中…”并显示旋转图标、约 3 秒内处于禁用状态；计时结束后显示原有成功结果。另在存在未办前置页的重置状态下重复验证，确认约 3 秒后显示原有错误信息。

- [ ] **Step 7: 提交实现**

```bash
git add yuhong-finance/src/components/panels/LedgerPanel.vue yuhong-finance/tests/task-content.test.js
git commit -m "feat: add ledger activation validation loading state"
```
