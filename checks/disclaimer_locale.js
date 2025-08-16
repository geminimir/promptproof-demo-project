module.exports = async function disclaimerLocaleCheck(text, record) {
  const violations = []

  // Apply only to support reply records
  const labels = Array.isArray(record.labels) ? record.labels : []
  const id = record.id || ''
  const isSupport = labels.includes('support') || /^sup-/.test(id) || /^support-/.test(id)
  if (!isSupport) {
    return violations
  }

  const locale = record.locale || (record.input && record.input.locale)
  const en = /We cannot share personal contact information\./i
  const fr = /Nous ne pouvons pas partager des coordonnées personnelles\./i

  if (locale === 'en') {
    if (!en.test(text || '')) {
      violations.push({
        id: `disclaimer_en-${record.id}-We cannot share personal contact information\.`,
        message: 'Required pattern not found: We cannot share personal contact information\.',
        path: 'text',
        severity: 'error'
      })
    }
  } else if (locale === 'fr') {
    if (!fr.test(text || '')) {
      violations.push({
        id: `disclaimer_fr-${record.id}-Nous ne pouvons pas partager des coordonnées personnelles\.`,
        message: 'Required pattern not found: Nous ne pouvons pas partager des coordonnées personnelles\.',
        path: 'text',
        severity: 'error'
      })
    }
  }

  return violations
}


