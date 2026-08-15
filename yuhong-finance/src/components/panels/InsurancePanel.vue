<script setup>
// 打开任务即展示阶段一报价全文，不再分步办理。
import PanelShell from './PanelShell.vue'
import { INSURANCE_WORKBOOK } from '../../data/insurance.js'

const quoteRows = [
  { label: '保费', a: '200元/人', b: '220元/人', c: '280元/人' },
  { label: '意外身故保额', a: '50万元', b: '100万元', c: '120万元' },
  { label: '意外伤残保额', a: '30万元', b: '60万元', c: '80万元' },
  { label: '医疗保额', a: '2万元', b: '5万元', c: '8万元' },
  { label: '免赔额', a: '200元', b: '100元', c: '150元' },
  { label: '等待期', a: '无等待期', b: '无等待期', c: '无等待期' },
  { label: '洪涝救援承保范围', a: '属于承保范围', b: '明确属于承保范围', c: '属于承保范围，需附补充协议' },
  { label: '理赔资料要求', a: '常规资料', b: '含出勤记录', c: '资料要求较全' },
  { label: '赔付时效', a: '15天', b: '7天', c: '10天' },
]

const coverageScores = [
  { label: '明确承保，无附加条件', score: 100 },
  { label: '一般条款包含洪涝救援', score: 80 },
  { label: '需要补充协议或附加条件', score: 60 },
  { label: '条款表述不明确，需保险公司确认', score: 40 },
  { label: '明确不承保', score: 0 },
]

function downloadUrl() {
  return `${import.meta.env.BASE_URL}workbooks/${encodeURIComponent(INSURANCE_WORKBOOK)}`
}
</script>

<template>
  <PanelShell title="救援人员保险方案比较" source="保险方案评审">
    <div class="task-flow open-tables insurance-brief">
      <article class="task-flow-page brief-doc">
        <header class="brief-hero">
          <p class="brief-kicker">采购成本保障岗 · 任务4</p>
          <h2 class="brief-title">救援人员保险方案比较</h2>
          <p class="brief-lead">一线救援人员直面山洪、塌方等高风险作业，必须配置合适的保险。</p>
          <p class="brief-lead">我现在对A、B、C三家保险公司分别所报价的保险产品进行比较——</p>
        </header>

        <section class="brief-section">
          <h3 class="brief-subhead">保险公司产品报价表</h3>
          <table class="calc-table compact center-text">
            <thead>
              <tr>
                <th>对比指标</th>
                <th>A保险公司</th>
                <th>B保险公司</th>
                <th>C保险公司</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in quoteRows" :key="row.label">
                <th scope="row">{{ row.label }}</th>
                <td>{{ row.a }}</td>
                <td>{{ row.b }}</td>
                <td>{{ row.c }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="brief-section">
          <h3 class="brief-subhead">建立保险产品比较表</h3>
          <p class="brief-note">
            指标权重：保费20%、身故保额20%、伤残保额10%、医疗15%、免赔额10%、等待期10%、承保范围10%、赔付时效5%。
          </p>
        </section>

        <section class="brief-section">
          <h3 class="brief-subhead">承保情况标准分</h3>
          <table class="calc-table compact center-text brief-score">
            <thead>
              <tr>
                <th>承保情况</th>
                <th>标准分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in coverageScores" :key="row.label">
                <th scope="row">{{ row.label }}</th>
                <td>{{ row.score }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="brief-section">
          <h3 class="brief-subhead">标准分计算规则</h3>
          <ol class="brief-rules">
            <li>成本型指标标准分=（最大值－本方案值）/（最大值－最小值）*100。</li>
            <li>适用于身故保额、伤残保额、医疗保额等效益型指标（数值越高越优）：</li>
            <li>效益型指标标准分=（本方案值－最小值）/（最大值－最小值）*100。</li>
          </ol>
        </section>

        <footer class="download-footer">
          <a class="file-link" :href="downloadUrl()" :download="INSURANCE_WORKBOOK">{{ INSURANCE_WORKBOOK }}</a>
        </footer>
      </article>
    </div>
  </PanelShell>
</template>
