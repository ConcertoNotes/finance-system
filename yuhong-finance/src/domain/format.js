export function money(value, digits = 2) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function int(value) {
  return Math.round(Number(value)).toLocaleString('zh-CN')
}

export function num(value, digits = 2) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function percent(value, digits = 2) {
  return `${(Number(value) * 100).toFixed(digits)}%`
}

export function signedPercent(value, digits = 2) {
  const text = (Number(value) * 100).toFixed(digits)
  return `${Number(value) > 0 ? '+' : ''}${text}%`
}
