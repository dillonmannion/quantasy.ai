'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './alert'

interface ErrorAlertProps {
  message: string
  title?: string
}

export function ErrorAlert({ message, title = 'Error' }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" aria-live="polite">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
