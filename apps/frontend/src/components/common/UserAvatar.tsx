import { useState } from 'react'
import { gravatarUrl, nameToHue } from '@/lib/utils'

interface Props {
  name: string
  email?: string
  size?: number
  className?: string
}

export function UserAvatar({ name, email, size = 32, className = '' }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const hue = nameToHue(name)

  if (email && !imgFailed) {
    return (
      <img
        src={gravatarUrl(email, size * 2)}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 60% 45%)` }}
      title={name}
    >
      {initials}
    </div>
  )
}
