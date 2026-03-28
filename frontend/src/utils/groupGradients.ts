const gradients = [
  'from-purple-500 to-pink-500',
  'from-indigo-500 to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-red-500',
]

export function getGroupGradient(id: string | number) {
  const index =
    typeof id === 'number' ? id % gradients.length : id.toString().charCodeAt(0) % gradients.length

  return gradients[index]
}
