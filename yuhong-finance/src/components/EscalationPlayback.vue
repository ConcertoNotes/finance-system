<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { AlertTriangle, Check, ChevronRight, Play, RotateCcw, Siren } from '@lucide/vue'
import StatusBadge from './StatusBadge.vue'
import { escalationPlayback } from '../data/rehearsal.js'

const emit = defineEmits(['finish'])

const done = ref(0)
const playing = ref(false)
let timer
const total = escalationPlayback.length
const finished = computed(() => done.value >= total)

function next() {
  if (!finished.value) done.value += 1
}

function autoPlay() {
  if (playing.value || finished.value) return
  playing.value = true
  timer = window.setInterval(() => {
    done.value += 1
    if (done.value >= total) {
      window.clearInterval(timer)
      playing.value = false
    }
  }, 1200)
}

function reset() {
  window.clearInterval(timer)
  playing.value = false
  done.value = 0
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="escalation-playback">
    <div class="playback-alert">
      <Siren :size="20" />
      <div>
        <strong>【数字人御洪星】警告，警告。检测到灾情数据异常更新！甲3、甲6网格受灾人数大幅增加，请立即处理！</strong>
        <p>【财务主管统筹岗】应急预算绩效岗，请立即导入新增灾情数据，更新驾驶舱，重新判断响应等级。</p>
      </div>
    </div>

    <ol class="playback-steps">
      <li
        v-for="(step, index) in escalationPlayback"
        :key="step.id"
        :class="{ done: index < done, current: index === done && !finished, waiting: index > done }"
      >
        <span class="playback-step-no">
          <Check v-if="index < done" :size="13" />
          <template v-else>{{ step.id }}</template>
        </span>
        <div class="playback-step-body">
          <strong>第{{ step.id }}步：{{ step.title }}</strong>
          <template v-if="index < done">
            <p v-if="step.text">{{ step.text }}</p>
            <div v-if="step.gridChanges" class="playback-grid-changes">
              <div v-for="entry in step.gridChanges" :key="entry.grid">
                <b>{{ entry.grid }}</b>
                <span v-for="change in entry.changes" :key="change.label" class="change-chip">
                  {{ change.label }} {{ change.from }}<i>→</i>{{ change.to }}<em>（{{ change.delta }}）</em>
                </span>
              </div>
            </div>
            <ul v-if="step.items" class="playback-items">
              <li v-for="item in step.items" :key="item"><ChevronRight :size="13" />{{ item }}</li>
            </ul>
            <div v-if="step.calcs" class="playback-calcs">
              <div v-for="calc in step.calcs" :key="calc.code">
                <span v-if="calc.label">{{ calc.label }}</span>
                <code>{{ calc.code }}</code>
                <small v-if="calc.note">{{ calc.note }}</small>
              </div>
            </div>
            <p v-if="step.conclusion" class="playback-conclusion"><AlertTriangle :size="13" />{{ step.conclusion }}</p>
          </template>
          <p v-else-if="index === done" class="playback-waiting-hint">待执行……</p>
        </div>
      </li>
    </ol>

    <footer class="playback-footer">
      <StatusBadge :label="`处置进度 ${done} / ${total}`" :tone="finished ? 'success' : 'warning'" dot />
      <div class="playback-actions">
        <button class="secondary-button" type="button" :disabled="done === 0 || playing" @click="reset"><RotateCcw :size="14" />重置</button>
        <button class="secondary-button" type="button" :disabled="finished || playing" @click="autoPlay"><Play :size="14" />自动推演</button>
        <button class="secondary-button" type="button" :disabled="finished || playing" @click="next">执行下一步<ChevronRight :size="14" /></button>
        <button class="primary-button" type="button" :disabled="!finished" @click="emit('finish')"><Check :size="15" />完成处置，提交升级审批</button>
      </div>
    </footer>
  </div>
</template>
