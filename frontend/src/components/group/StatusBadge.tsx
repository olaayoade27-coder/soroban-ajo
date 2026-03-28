export default function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-400',
    pending: 'bg-yellow-400',
    completed: 'bg-blue-400',
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full animate-pulse ${styles[status as keyof typeof styles]}`}
      />
      <span className="text-xs text-white/80 capitalize">{status}</span>
    </div>
  )
}
