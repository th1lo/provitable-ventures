import React from 'react'

export interface BadgeProps {
  variant?: "default" | "secondary" | "destructive" | "outline"
  className?: string
  children?: React.ReactNode
}

export function Badge({ className = "", variant = "default", children, ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors"
  
  const variantClasses = {
    default: "border-transparent bg-orange-600 text-white shadow hover:bg-orange-700",
    secondary: "border-transparent bg-gray-600 text-gray-100 hover:bg-gray-700",
    destructive: "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
    outline: "border-gray-600 text-gray-300 hover:bg-gray-700",
  }

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  )
} 