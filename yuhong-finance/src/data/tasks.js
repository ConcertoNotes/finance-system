import { taskContent } from './generated/taskContent.js'
import { roles } from './roles.js'

export const tasks = taskContent.map((task) => ({
  ...task,
  stepCount: task.steps.filter((step) => step.label !== '任务导入').length,
  roleCount: task.roles.length,
}))

const taskMap = new Map(tasks.map((task) => [task.key, task]))

export function getTask(key) {
  return taskMap.get(key) ?? null
}

/**
 * 该岗位承担的任务，按工作簿顺序连续编号。
 * 第二阶段的任务号接着第一阶段往下排，因此 seq 与工作簿里的 no 不一定相同。
 */
export function getTasksByRole(roleId) {
  return tasks
    .filter((task) => task.roles.includes(roleId))
    .sort((a, b) => a.stage - b.stage || a.no - b.no)
    .map((task, index) => ({ ...task, seq: index + 1 }))
}

export function getTaskSeq(roleId, key) {
  return getTasksByRole(roleId).find((task) => task.key === key)?.seq ?? null
}

/** 只保留该岗位发言的步骤，用于岗位视角的任务详情。 */
export function getRoleSteps(task, roleId) {
  return task.steps.filter((step) => step.roleId === roleId)
}

export function getRoleTaskCount(roleId) {
  return getTasksByRole(roleId).length
}

export const roleTaskIndex = roles.map((role) => ({
  role,
  tasks: getTasksByRole(role.id),
  total: getRoleTaskCount(role.id),
}))

/** 全流程任务序列：第一阶段 5 个在前，第二阶段 6 个接续为 6—11。 */
export const allTasksInOrder = tasks
  .slice()
  .sort((a, b) => a.stage - b.stage || a.no - b.no)
  .map((task, index) => ({ ...task, seq: index + 1 }))

export function getNeighbourTasks(roleId, key) {
  const list = getTasksByRole(roleId)
  const index = list.findIndex((task) => task.key === key)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  }
}
