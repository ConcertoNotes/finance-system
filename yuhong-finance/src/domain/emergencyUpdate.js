import { abcPlanMap } from '../data/abcBudget.js'
import {
  FOOD_RATE,
  confirmedFundsAtHalfHour,
  fiscalAfterG03,
  paramShift,
  plannedFiscal,
  secondDecision,
} from '../data/emergencyUpdate.js'
import { coverageRate, coverageStatus, fundingGap } from './abcBudget.js'

export function foodBudget(relocated, days, rate = FOOD_RATE) {
  return Number(relocated) * Number(days) * Number(rate)
}

export function foodIncrement(oldRelocated, oldDays, nextRelocated, nextDays, rate = FOOD_RATE) {
  return foodBudget(nextRelocated, nextDays, rate) - foodBudget(oldRelocated, oldDays, rate)
}

export function gridFoodShifts(rate = FOOD_RATE) {
  return {
    jia3: {
      personDays: paramShift.gridJia3.next * paramShift.shelterDays.next,
      food: foodBudget(paramShift.gridJia3.next, paramShift.shelterDays.next, rate),
      oldFood: foodBudget(paramShift.gridJia3.old, paramShift.shelterDays.old, rate),
      increment: foodIncrement(
        paramShift.gridJia3.old,
        paramShift.shelterDays.old,
        paramShift.gridJia3.next,
        paramShift.shelterDays.next,
        rate,
      ),
    },
    jia6: {
      personDays: paramShift.gridJia6.next * paramShift.shelterDays.next,
      food: foodBudget(paramShift.gridJia6.next, paramShift.shelterDays.next, rate),
      oldFood: foodBudget(paramShift.gridJia6.old, paramShift.shelterDays.old, rate),
      increment: foodIncrement(
        paramShift.gridJia6.old,
        paramShift.shelterDays.old,
        paramShift.gridJia6.next,
        paramShift.shelterDays.next,
        rate,
      ),
    },
  }
}

export function bCoverage(available = confirmedFundsAtHalfHour, demand = abcPlanMap.B.total) {
  const rate = coverageRate(available, demand)
  return {
    available,
    demand,
    rate,
    percent: rate * 100,
    gap: fundingGap(available, demand),
    status: coverageStatus(rate),
  }
}

export function cResilience(available = plannedFiscal, demand = abcPlanMap.C.total, reserve = abcPlanMap.C.reserve) {
  const rate = coverageRate(available, demand)
  const buffer = reserve / demand
  return {
    available,
    demand,
    reserve,
    rate,
    percent: rate * 100,
    buffer,
    bufferPercent: buffer * 100,
    gap: fundingGap(available, demand),
    status: coverageStatus(rate),
    redCross: secondDecision.redCross,
  }
}

export function g03ArrivalRate(actual = fiscalAfterG03) {
  return actual.cumulative / actual.planned
}
