<script setup>
import { assistant } from '../data/roles.js'

// 御洪星在两份工作簿中的出场：作为第四类数据源接入，并在任务3的共享对象中列名。
const duties = [
  {
    title: '灾区需求数据采集',
    source: '数据采集系统 · 第二步',
    detail: '作为数据源04接入，数据类型为语音转译/结构化数据，内容包括网格编号、需求物资、紧急程度、上报时间，实时同步。',
  },
  {
    title: '敏感数据访问权限',
    source: '数据采集系统 · 第六步',
    detail: '在九网格敏感数据集中被授予「采集、识别、风险提示」权限，与四个业务岗位的读取权限分级管理。',
  },
  {
    title: '合规校验单共享对象',
    source: '合规性检测 · 第九步',
    detail: '与应急预算绩效岗、采购成本保障岗、资金核算风控岗并列，接收《9网格清洗数据》与《灾情数据质量与合规校验单》。',
  },
]
</script>

<template>
  <div class="page">
    <header class="page-title-bar">
      <div class="page-title-main">
        <h1 class="page-title">{{ assistant.name }}</h1>
        <p class="page-subtitle">{{ assistant.responsibility }}</p>
      </div>
      <div class="page-title-side">
        <div class="title-stats">
          <div><strong>{{ assistant.code }}</strong><span>角色编码</span></div>
          <div><strong>{{ assistant.permissions.length }}</strong><span>权限项</span></div>
        </div>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <h2>权限与边界</h2>
        <span class="panel-source">启用专项账套 · 第六步「设置岗位权限」</span>
      </div>
      <div class="panel-body permission-body">
        <div class="permission-tags">
          <span v-for="item in assistant.permissions" :key="item" class="permission-tag">{{ item }}</span>
        </div>
        <p class="permission-limit">
          <span class="limit-label">权限限制</span>{{ assistant.restriction }}
        </p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>在业务流程中的职责</h2>
        <span class="panel-source">按工作簿原文归集</span>
      </div>
      <div class="panel-body">
        <ul class="duty-list">
          <li v-for="item in duties" :key="item.title">
            <div class="duty-head">
              <strong>{{ item.title }}</strong>
              <span class="panel-source">{{ item.source }}</span>
            </div>
            <p>{{ item.detail }}</p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
