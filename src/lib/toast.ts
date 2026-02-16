import { toast } from 'sonner'

export function showSuccess(message: string, description?: string) {
  return toast.success(message, { description })
}

export function showError(message: string, description?: string) {
  return toast.error(message, { description })
}

export function showInfo(message: string, description?: string) {
  return toast.info(message, { description })
}

export function showWarning(message: string, description?: string) {
  return toast.warning(message, { description })
}

export function showLoading(message: string, description?: string) {
  return toast.loading(message, { description })
}

export { showAchievementToast } from '@/components/gamification/achievement-toast'
