export function numberToWords(n: number): string {
  if (n === 0) return 'zero francs'

  const ones = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ]
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  function convertBelow1000(num: number): string {
    let result = ''
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' hundred '
      num %= 100
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' '
      num %= 10
    }
    if (num > 0) {
      result += ones[num] + ' '
    }
    return result.trim()
  }

  let result = ''
  let remaining = n

  if (remaining >= 1000000) {
    const millions = Math.floor(remaining / 1000000)
    result += convertBelow1000(millions) + ' million '
    remaining %= 1000000
  }
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000)
    result += convertBelow1000(thousands) + ' thousand '
    remaining %= 1000
  }
  if (remaining > 0) {
    result += convertBelow1000(remaining)
  }

  return result.trim() + (result.trim() ? ' francs' : '')
}
