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

const RMB_DIGITS = '零壹贰叁肆伍陆柒捌玖'
const RMB_UNITS = ['', '拾', '佰', '仟']

function sectionUpper(n) {
  if (!n) return ''
  const digits = String(n)
  let text = ''
  let zero = false
  let started = false
  digits.split('').forEach((ch, index) => {
    const d = Number(ch)
    const unit = RMB_UNITS[digits.length - 1 - index]
    if (d === 0) {
      if (started) zero = true
      return
    }
    if (zero) text += '零'
    zero = false
    started = true
    text += RMB_DIGITS[d] + unit
  })
  return text
}

/** 将金额转为合同大写，如 932460 → 玖拾叁万贰仟肆佰陆拾元整。 */
export function rmbUpper(value) {
  const cents = Math.round(Number(value) * 100)
  if (!Number.isFinite(cents) || cents < 0) return ''
  const yuan = Math.trunc(cents / 100)
  const jiao = Math.trunc((cents % 100) / 10)
  const fen = cents % 10
  if (yuan === 0 && jiao === 0 && fen === 0) return '零元整'

  const yi = Math.trunc(yuan / 100000000)
  const wan = Math.trunc((yuan % 100000000) / 10000)
  const rest = yuan % 10000
  let text = ''
  if (yi) text += `${sectionUpper(yi)}亿`
  if (wan) {
    if (yi && wan < 1000) text += '零'
    text += `${sectionUpper(wan)}万`
  } else if (yi && rest) {
    text += '零'
  }
  if (rest) {
    if ((yi || wan) && rest < 1000) text += '零'
    text += sectionUpper(rest)
  }
  text += '元'
  if (jiao === 0 && fen === 0) return `${text}整`
  if (jiao) text += `${RMB_DIGITS[jiao]}角`
  if (fen) text += `${RMB_DIGITS[fen]}分`
  else if (jiao) text += '整'
  return text
}
