import { createRouter, createWebHashHistory } from 'vue-router'

import AppLayout from '../layouts/AppLayout.vue'
import HomeView from '../views/HomeView.vue'
import RoleTasksView from '../views/RoleTasksView.vue'
import TaskDetailView from '../views/TaskDetailView.vue'
import AssistantView from '../views/AssistantView.vue'
import WorkbookView from '../views/WorkbookView.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', component: HomeView, meta: { title: '御洪智策 · 洪涝应急财经决策平台' } },
      { path: 'role/:roleId', name: 'role', component: RoleTasksView, meta: { title: '岗位任务' } },
      { path: 'role/:roleId/:taskKey', name: 'task', component: TaskDetailView, meta: { title: '任务详情' } },
      { path: 'assistant', name: 'assistant', component: AssistantView, meta: { title: '数字人御洪星' } },
      { path: 'workbooks', name: 'workbooks', component: WorkbookView, meta: { title: '补充数据表' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  if (to.meta?.title) document.title = `${to.meta.title} · 御洪智策`
})
