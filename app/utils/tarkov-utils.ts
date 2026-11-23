export const formatCurrency = (amount: number, currency: 'RUB' | 'USD' | 'EUR' = 'RUB') => {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount))

  const symbols = {
    RUB: '₽',
    USD: '$',
    EUR: '€'
  }

  return `${symbols[currency]} ${formattedNumber}`
}

// Barters from Ref ask for fractional amounts of GP coins, so counts are not always whole numbers
export const formatCount = (count: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(count)

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}
