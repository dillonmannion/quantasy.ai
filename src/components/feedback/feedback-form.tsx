'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Star } from 'lucide-react'

export function FeedbackForm() {
  const [feature, setFeature] = useState<string>('')
  const [rating, setRating] = useState<number>(0)
  const [text, setText] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!feature || rating === 0) {
      toast.error('Please select a feature and rating')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, rating, text: text || undefined }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }

      toast.success('Thank you for your feedback!')
      // Reset form
      setFeature('')
      setRating(0)
      setText('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feature Dropdown */}
      <div>
        <label htmlFor="feedback-feature" className="block text-sm font-medium mb-2">Feature</label>
        <Select value={feature} onValueChange={setFeature}>
          <SelectTrigger id="feedback-feature">
            <SelectValue placeholder="Select a feature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft Assistant</SelectItem>
            <SelectItem value="roster">Roster Optimizer</SelectItem>
            <SelectItem value="trade">Trade Calculator</SelectItem>
            <SelectItem value="waivers">Waiver Wire</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Star Rating */}
      <div>
        <label id="feedback-rating-label" className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-2" role="group" aria-labelledby="feedback-rating-label">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} out of 5 stars`}
              aria-pressed={star <= rating}
              className="h-11 w-11 flex items-center justify-center transition-colors"
            >
              <Star
                className={`h-11 w-11 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Text Area */}
      <div>
        <label htmlFor="feedback-comments" className="block text-sm font-medium mb-2">
          Additional Comments (Optional)
        </label>
        <Textarea
          id="feedback-comments"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us more about your experience..."
          maxLength={1000}
          rows={5}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {text.length}/1000 characters
        </p>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </Button>
    </form>
  )
}
