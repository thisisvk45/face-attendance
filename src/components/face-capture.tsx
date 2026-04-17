'use client'

import { useEffect, useRef, useState } from 'react'
import { loadModels, extractDescriptors, averageDescriptors } from '@/lib/face-recognition'
import { Button } from '@/components/ui/button'

interface FaceCaptureProps {
  onCapture: (descriptor: number[], imageBase64: string) => void
  onCancel: () => void
}

export function FaceCapture({ onCapture, onCancel }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'capturing' | 'done' | 'error'>('loading')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let stream: MediaStream | null = null
    async function init() {
      try {
        await loadModels()
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: 'user' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('ready')
      } catch {
        setStatus('error')
      }
    }
    init()
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function handleCapture() {
    if (!videoRef.current) return
    setStatus('capturing')
    setProgress(0)

    const descriptors: Float32Array[] = []
    for (let i = 0; i < 3; i++) {
      setProgress(i + 1)
      const results = await extractDescriptors(videoRef.current, 1, 0)
      if (results.length > 0) descriptors.push(results[0])
      if (i < 2) await new Promise((r) => setTimeout(r, 800))
    }

    if (descriptors.length === 0) {
      setStatus('ready')
      alert('No face detected. Please try again with better lighting and face the camera directly.')
      return
    }

    const averaged = averageDescriptors(descriptors)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)

    setStatus('done')
    onCapture(averaged, imageBase64)
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white">Loading camera & models...</p>
          </div>
        )}
        {status === 'capturing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white text-lg">Capturing... ({progress}/3)</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-red-400">Camera access denied</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCapture} disabled={status !== 'ready'} className="flex-1">
          {status === 'capturing' ? 'Capturing...' : 'Capture Face (3 shots)'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
