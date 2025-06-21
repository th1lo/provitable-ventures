import React from 'react'

export interface ButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg"
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}

export function Button({ 
  variant = "default", 
  size = "default", 
  className = "", 
  children, 
  disabled = false,
  onClick,
  ...props 
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variantClasses = {
    default: "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500",
    outline: "border border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-gray-500",
    ghost: "text-gray-300 hover:bg-gray-700 focus:ring-gray-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  }

  const sizeClasses = {
    default: "h-10 py-2 px-4",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-lg",
  }

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button 
      className={combinedClasses} 
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
} 