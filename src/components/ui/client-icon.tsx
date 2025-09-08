"use client"

import { LucideIcon } from 'lucide-react'
import { ComponentProps, useEffect, useState } from 'react'

interface ClientIconProps extends Omit<ComponentProps<'svg'>, 'ref'> {
  icon: LucideIcon
}

// Simple client-only icon component
export default function ClientIcon({ icon: Icon, ...props }: ClientIconProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div 
        className="inline-block"
        style={{ 
          width: '1rem', 
          height: '1rem',
          backgroundColor: 'transparent'
        }}
      />
    )
  }

  return <Icon {...props} />
}