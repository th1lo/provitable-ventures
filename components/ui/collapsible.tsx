import React, { useState, createContext, useContext } from 'react'

interface CollapsibleContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined)

export interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Collapsible({ children, open: controlledOpen, onOpenChange }: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  
  const setOpen = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

export interface CollapsibleTriggerProps {
  children?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function CollapsibleTrigger({ children, className = "", onClick }: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext)
  
  const handleClick = () => {
    onClick?.()
    context?.setOpen(!context.open)
  }

  return (
    <div className={`cursor-pointer ${className}`} onClick={handleClick}>
      {children}
    </div>
  )
}

export interface CollapsibleContentProps {
  children?: React.ReactNode
  className?: string
}

export function CollapsibleContent({ children, className = "" }: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext)
  
  if (!context?.open) return null

  return (
    <div className={className}>
      {children}
    </div>
  )
} 