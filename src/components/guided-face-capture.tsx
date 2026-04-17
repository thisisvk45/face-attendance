'use client'

import { useEffect, useRef, useState } from 'react'
import { loadModels, detectFace, averageDescriptors } from '@/lib/face-recognition'
import { Button } from '@/components/ui/button'

interface GuidedFaceCaptureProps {
  onComplete: (descriptor: number[], imageBase64: string) => void
  onCancel: () => void
}

type Pose = { key: string; label: string; hint: string }

const POSES: Pose[] = [
  { key: 'center', label: 'Look straight at the camera', hint: 'Keep your face centered' },
  { key: 'left', label: 'Turn slightly to your LEFT', hint: 'Just a small turn' },
  { key: 'right', label: 'Turn slightly to your RIGHT', hint: 'Just a small turn' },
  { key: 'up', label: 'Tilt your head UP slightly', hint: 'Chin up a little' },
  { key: 'down', label: 'Tilt your head DOWN slightly', hint: 'Chin down a little' },
]

type Status = 'loading' | 'ready' | 'capturing' | 'done' | 'error'

export function GuidedFaceCapture({ onComplete, onCancel }: GuidedFaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [poseIndex, setPoseIndex] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedCount, setCapturedCount] = useState(0)
  const descriptorsRef = useRef<Float32Array[]>([])
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false })

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    async function init() {
      try {
        await loadModels()
      } catch (err) {
        if (cancelled) return
        console.error('[guided-capture] model load failed:', err)
        setErrorMsg('Failed to load face models. Reload the page.')
        setStatus('error')
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Camera API unavailable. Use Chrome/Safari on https or localhost.')
        setStatus('error')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr) {
            if ((playErr as DOMException).name !== 'AbortError') throw playErr
          }
        }
        if (!cancelled) setStatus('ready')
      } catch (err) {
        if (cancelled) return
        const e = err as DOMException
        console.error('[guided-capture] camera error:', e.name, e.message)
        if (e.name === 'NotAllowedError') {
          setErrorMsg('Camera permission denied. Allow camera and reload.')
        } else if (e.name === 'NotReadableError') {
          setErrorMsg('Camera is in use by another app. Close it and reload.')
        } else {
          setErrorMsg(`Camera error: ${e.name}`)
        }
        setStatus('error')
      }
    }
    init()
    return () => {
      cancelled = true
      abortRef.current.aborted = true
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startCapture() {
    if (!videoRef.current) return
    // Fresh abort token per run — not tied to the component mount cycle
    const token = { aborted: false }
    abortRef.current = token

    setStatus('capturing')
    descriptorsRef.current = []
    setCapturedCount(0)
    setErrorMsg('')

    try {
      for (let i = 0; i < POSES.length; i++) {
        if (token.aborted) { console.log('[guided-capture] aborted before pose', i); return }
        console.log('[guided-capture] starting pose', i, POSES[i].key)
        setPoseIndex(i)

        // Countdown 3-2-1
        for (let c = 3; c >= 1; c--) {
          if (token.aborted) return
          setCountdown(c)
          await sleep(600)
        }
        setCountdown(null)

        // Try up to 3 times to grab a descriptor for this pose
        let gotDescriptor = false
        for (let attempt = 0; attempt < 3; attempt++) {
          if (token.aborted) return
          try {
            const detection = await detectFace(videoRef.current)
            if (detection) {
              descriptorsRef.current.push(detection.descriptor)
              setCapturedCount(descriptorsRef.current.length)
              gotDescriptor = true
              console.log('[guided-capture] captured pose', i, 'total', descriptorsRef.current.length)
              break
            }
          } catch (detErr) {
            console.error('[guided-capture] detectFace threw on pose', i, 'attempt', attempt, detErr)
          }
          await sleep(300)
        }
        if (!gotDescriptor) console.warn('[guided-capture] no face on pose', POSES[i].key)

        await sleep(400)
      }
    } catch (err) {
      console.error('[guided-capture] capture loop crashed:', err)
      setErrorMsg('Capture failed unexpectedly. Please try again.')
      setStatus('ready')
      setPoseIndex(0)
      setCountdown(null)
      setCapturedCount(0)
      return
    }

    console.log('[guided-capture] loop done. descriptors:', descriptorsRef.current.length)

    if (descriptorsRef.current.length < 2) {
      setErrorMsg('Could not detect your face well enough. Make sure the room is well lit and you face the camera directly.')
      setStatus('ready')
      setPoseIndex(0)
      setCountdown(null)
      setCapturedCount(0)
      return
    }

    // Snap final photo
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85)

    const averaged = averageDescriptors(descriptorsRef.current)
    setStatus('done')
    onComplete(averaged, imageBase64)
  }

  const currentPose = POSES[poseIndex]
  const progress = Math.round((capturedCount / POSES.length) * 100)

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-3" />
              <p className="text-white">Loading camera & models…</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <p className="text-red-400 text-center text-lg font-medium">{errorMsg}</p>
          </div>
        )}

        {status === 'capturing' && (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-5 text-center">
            <p className="text-white text-xl font-bold">{currentPose.label}</p>
            <p className="text-white/70 text-sm mt-1">{currentPose.hint}</p>
          </div>
        )}

        {status === 'capturing' && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-28 h-28 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-6xl font-bold">{countdown}</span>
            </div>
          </div>
        )}

        {status === 'capturing' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <span>Step {poseIndex + 1} of {POSES.length}</span>
              <span>{capturedCount} / {POSES.length} captured</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === 'ready' && errorMsg && (
          <div className="absolute inset-x-0 top-0 bg-amber-500/90 text-white text-center py-3 px-4 text-sm font-medium">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={startCapture}
          disabled={status !== 'ready'}
          className="flex-1"
        >
          {status === 'capturing' ? 'Capturing…' : status === 'ready' ? 'Start Capture' : 'Please wait…'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={status === 'capturing'}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
