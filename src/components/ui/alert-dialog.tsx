"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AlertDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface AlertDialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface AlertDialogContentProps {
  children: React.ReactNode
}

interface AlertDialogActionProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface AlertDialogCancelProps {
  children: React.ReactNode
  onClick?: () => void
}

const AlertDialogContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

const AlertDialog: React.FC<AlertDialogProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = React.useCallback((value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }, [isControlled, onOpenChange])

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({ children, asChild }) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = () => setOpen(true)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as any)
  }
  
  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children }) => {
  const { open, setOpen } = React.useContext(AlertDialogContext)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        {children}
      </DialogContent>
    </Dialog>
  )
}

const AlertDialogHeader = DialogHeader
const AlertDialogTitle = DialogTitle
const AlertDialogDescription = DialogDescription
const AlertDialogFooter = DialogFooter

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ children, onClick, className }) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = () => {
    onClick?.()
    setOpen(false)
  }
  
  return (
    <Button onClick={handleClick} className={className}>
      {children}
    </Button>
  )
}

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ children, onClick }) => {
  const { setOpen } = React.useContext(AlertDialogContext)
  
  const handleClick = () => {
    onClick?.()
    setOpen(false)
  }
  
  return (
    <Button variant="outline" onClick={handleClick}>
      {children}
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}