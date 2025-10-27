
const convertOmittedAddress = (address) =>
  `${address.slice(0, 5)}...${address.slice(-4)}`


const safeParse = (v) => {
  if (typeof v !== 'string') return v
  const s = v.trim()
  const looksJson =
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('[') && s.endsWith(']'))

  if (!looksJson) return v

  try {
    return JSON.parse(s)
  } catch (err) {
    console.warn('[safeParse] invalid JSON string:', s)
    return v
  }
}

module.exports = { convertOmittedAddress, safeParse }
