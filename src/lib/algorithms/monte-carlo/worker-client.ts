import type { MonteCarloInput, MonteCarloOutput } from './types'

export type WorkerMessage =
  | { type: 'START'; input: MonteCarloInput; candidatePlayers: string[] }
  | { type: 'CANCEL' }

export type WorkerResponse =
  | { type: 'PROGRESS'; progress: number }
  | { type: 'RESULT'; output: MonteCarloOutput }
  | { type: 'ERROR'; error: string }

export class MonteCarloWorker {
  private worker: Worker | null = null
  private resolvePromise: ((value: MonteCarloOutput) => void) | null = null
  private rejectPromise: ((reason: Error) => void) | null = null
  private onProgress: ((progress: number) => void) | null = null

  runSimulation(
    input: MonteCarloInput,
    candidatePlayers: string[],
    onProgress?: (progress: number) => void
  ): Promise<MonteCarloOutput> {
    if (this.worker) {
      this.terminate()
    }

    this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })

    this.onProgress = onProgress || null

    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve
      this.rejectPromise = reject

      if (!this.worker) return

      this.worker.addEventListener('message', this.handleMessage)
      this.worker.addEventListener('error', this.handleError)

      this.worker.postMessage({ type: 'START', input, candidatePlayers })
    })
  }

  cancel(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CANCEL' })
    }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.cleanup()
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const { data } = event

    switch (data.type) {
      case 'PROGRESS':
        if (this.onProgress) {
          this.onProgress(data.progress)
        }
        break
      case 'RESULT':
        if (this.resolvePromise) {
          this.resolvePromise(data.output)
        }
        this.cleanup()
        break
      case 'ERROR':
        if (this.rejectPromise) {
          this.rejectPromise(new Error(data.error))
        }
        this.cleanup()
        break
    }
  }

  private handleError = (error: ErrorEvent) => {
    if (this.rejectPromise) {
      this.rejectPromise(new Error(error.message))
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.resolvePromise = null
    this.rejectPromise = null
    this.onProgress = null
  }
}
