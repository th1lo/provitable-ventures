import React from 'react'
import { cn } from '../../lib/utils'

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

export interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export interface ToggleGroupItemProps {
  value: string
  children: React.ReactNode
  className?: string
  isSelected?: boolean
  onClick?: () => void
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({ 
  value, 
  onValueChange, 
  children, 
  className = "" 
}) => {
  return (
    <div className={`inline-flex rounded-md shadow-sm ${className}`} role="group">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement<ToggleGroupItemProps>(child)) {
          const childValue = child.props.value
          return (
            <ToggleGroupItem
              key={childValue || index}
              value={childValue}
              isSelected={childValue === value}
              onClick={() => onValueChange(childValue)}
              className={child.props.className}
            >
              {child.props.children}
            </ToggleGroupItem>
          )
        }
        return child
      })}
    </div>
  )
}

export const ToggleGroupItem: React.FC<ToggleGroupItemProps> = ({ 
  children, 
  isSelected = false, 
  onClick,
  className = "" 
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium border transition-colors",
        "first:rounded-l-md last:rounded-r-md",
        "focus:z-10 ",
        isSelected
          ? "bg-neutral-100 text-black border-neutral-200 dark:border-neutral-700"
          : "bg-white text-neutral-900 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-700",
        className
      )}
    >
      {children}
    </button>
  )
} 