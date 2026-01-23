'use client'

import { motion, AnimatePresence } from 'motion/react'

interface KachingProps {
  show: boolean
  value: number | string
  label?: string
  variant?: 'gold' | 'green' | 'purple'
  onComplete?: () => void
}

const colorMap = {
  gold: 'from-yellow-400 to-yellow-600 text-black',
  green: 'from-green-400 to-green-600 text-white',
  purple: 'from-purple-400 to-purple-600 text-white',
}

const emojiMap = {
  gold: '\uD83D\uDCB0',
  green: '\u2713',
  purple: '\u2B50',
}

const particleOffsets = [0, 15, 30, 8, 22]

export function Kaching({ 
  show, 
  value, 
  label, 
  variant = 'gold', 
  onComplete 
}: KachingProps) {
  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.2, y: -50 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 25
          }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <div className={`
            bg-gradient-to-br ${colorMap[variant]} 
            rounded-2xl px-8 py-6 shadow-2xl
            border-4 border-white/30 relative overflow-hidden
          `}>
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: (i - 2) * 40,
                  y: -60 - particleOffsets[i],
                  opacity: 0,
                }}
                transition={{ delay: i * 0.05, duration: 0.8 }}
                className="absolute text-2xl top-1/2 left-1/2"
              >
                {emojiMap[variant]}
              </motion.span>
            ))}
            
            <div className="text-5xl font-black text-center">
              +{value}
            </div>
            {label && (
              <div className="text-lg font-semibold text-center mt-1 opacity-80">
                {label}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
