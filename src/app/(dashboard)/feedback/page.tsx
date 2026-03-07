import { FeedbackForm } from '@/components/feedback/feedback-form'

export default function FeedbackPage() {
  return (
    <div className="container max-w-2xl md:max-w-3xl py-8 pb-24 lg:pb-0">
      <h1 className="text-3xl font-bold mb-2">Share Your Feedback</h1>
      <p className="text-muted-foreground mb-8">
        Help us improve Quantasy by sharing your thoughts on our features.
      </p>
      <FeedbackForm />
    </div>
  )
}
