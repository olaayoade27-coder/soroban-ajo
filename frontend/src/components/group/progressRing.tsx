'use client'

import React from 'react'

interface ProgressRingProps {
  progress: number // 0 - 100
  size?: number
  strokeWidth?: number
}

export default function ProgressRing({ progress, size = 60, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        stroke="rgba(255,255,255,0.2)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke="white"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  )
}
