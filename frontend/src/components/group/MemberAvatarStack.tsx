interface Member {
  id: string
  avatar: string
  name: string
}

export default function MemberAvatarStack({ members }: { members: Member[] }) {
  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        {members.slice(0, 5).map((m) => (
          <img
            key={m.id}
            src={m.avatar}
            alt={m.name}
            className="h-8 w-8 rounded-full ring-2 ring-white object-cover"
          />
        ))}
      </div>

      {members.length > 5 && (
        <span className="ml-2 text-xs text-white/80">+{members.length - 5}</span>
      )}
    </div>
  )
}
