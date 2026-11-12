// Preserve exact decimal strings, including large historical totals.
export function amount(value) {
  const [integer, fraction = ''] = String(value ?? '0').split('.')
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${fraction.padEnd(2, '0')}`
}
export function date(value) {
  return value ? new Date(value).toLocaleString('es-PE') : '—'
}
