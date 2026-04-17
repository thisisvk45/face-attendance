'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as faceapi from 'face-api.js'
import { getFaceDescriptors, recordAttendance, getKioskStats, type KioskStats } from './actions'
import { loadModels, buildLabeledDescriptors, detectFace } from '@/lib/face-recognition'
import type { FaceData, AttendanceResult, Office } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { KioskRegisterDialog } from '@/components/kiosk-register-dialog'
import Link from 'next/link'

type ResultState = {
  employee: FaceData
  attendance: AttendanceResult
  confidence: number
} | null

function formatTime(iso: string, timezone?: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    })
  } catch {
    return iso
  }
}

function formatMinutesOfDay(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function StatPill({
  label,
  value,
  tone,
  live = false,
}: {
  label: string
  value: string
  tone: 'brand' | 'emerald' | 'muted'
  live?: boolean
}) {
  const valueColor =
    tone === 'brand' ? 'text-brand' : tone === 'emerald' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="flex items-center gap-2">
      {live && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      <span className={`font-mono font-semibold text-base ${valueColor}`}>{value}</span>
      <span className="text-[#94A3B8] text-xs uppercase tracking-wide">{label}</span>
    </div>
  )
}

export function KioskView({ office }: { office: Office }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [result, setResult] = useState<ResultState>(null)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const lockRef = useRef(false)
  const animFrameRef = useRef<number>(0)
  const [registerOpen, setRegisterOpen] = useState(false)
  const queryClient = useQueryClient()
  // Per-employee cooldown: employee_id -> epoch ms until which we ignore them
  const cooldownRef = useRef<Map<string, number>>(new Map())
  const FACE_COOLDOWN_MS = 30_000

  // Whether the result overlay stays until user dismisses (home button)
  const [resultSticky, setResultSticky] = useState(false)

  const { data: faceData = [] } = useQuery<FaceData[]>({
    queryKey: ['face-descriptors', office.id],
    queryFn: () => getFaceDescriptors(office.id),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery<KioskStats>({
    queryKey: ['kiosk-stats', office.id],
    queryFn: () => getKioskStats(office.id, office.timezone),
    refetchInterval: 30 * 1000,
    staleTime: 25 * 1000,
  })

  // Clock — always in the office's local timezone
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: office.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const dateFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: office.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const tick = () => {
      const now = new Date()
      setCurrentTime(timeFmt.format(now))
      setCurrentDate(dateFmt.format(now))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [office.timezone])

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    async function initCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not available. Use Chrome/Safari over https:// or http://localhost.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 720, height: 560, facingMode: 'user' },
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
            // play() can be aborted on fast re-mount (React strict mode) — benign
            if ((playErr as DOMException).name !== 'AbortError') throw playErr
          }
        }
      } catch (err) {
        if (cancelled) return
        const e = err as DOMException
        console.error('[kiosk] getUserMedia failed:', e.name, e.message)
        if (e.name === 'NotAllowedError') {
          setError('Camera permission denied. Click the camera icon in the address bar and allow, then reload.')
        } else if (e.name === 'NotFoundError') {
          setError('No camera detected on this device.')
        } else if (e.name === 'NotReadableError') {
          setError('Camera is in use by another app (Zoom, Teams, FaceTime). Close it and reload.')
        } else if (e.name === 'OverconstrainedError') {
          setError('Camera does not support requested resolution.')
        } else {
          setError(`Camera error: ${e.name} - ${e.message}`)
        }
      }
    }
    initCamera()
    return () => {
      cancelled = true
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Load models
  useEffect(() => {
    loadModels()
      .then(() => setModelsLoaded(true))
      .catch((err) => {
        console.error('[kiosk] model load failed:', err)
        setError(`Failed to load face models: ${err?.message || 'unknown error'}`)
      })
  }, [])

  useEffect(() => {
    if (modelsLoaded) setIsReady(true)
  }, [modelsLoaded])

  // Detection loop
  const detect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) {
      animFrameRef.current = requestAnimationFrame(() => setTimeout(detect, 800))
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    // ----- Normal matching mode -----
    if (lockRef.current) {
      animFrameRef.current = requestAnimationFrame(() => setTimeout(detect, 800))
      return
    }

    try {
      const detection = await detectFace(video)
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (detection && faceData.length > 0) {
        setIsDetecting(true)

        // Draw bounding box
        if (ctx) {
          const box = detection.detection.box
          ctx.strokeStyle = '#2DD4BF'
          ctx.lineWidth = 3
          ctx.setLineDash([8, 4])
          ctx.strokeRect(box.x, box.y, box.width, box.height)
          ctx.setLineDash([])

          // Corner accents
          const cornerLen = 20
          ctx.strokeStyle = '#2DD4BF'
          ctx.lineWidth = 4
          // Top-left
          ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke()
          // Top-right
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke()
          // Bottom-left
          ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke()
          // Bottom-right
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke()
        }

        const labeledDescriptors = buildLabeledDescriptors(faceData)
        if (labeledDescriptors.length > 0) {
          const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5)
          const match = faceMatcher.findBestMatch(detection.descriptor)

          if (match.label !== 'unknown') {
            const confidence = 1 - match.distance
            const employee = faceData.find((d) => d.id === match.label)

            // Per-face cooldown: skip if this employee was processed recently
            const cooledUntil = employee ? cooldownRef.current.get(employee.id) || 0 : 0
            const inCooldown = Date.now() < cooledUntil

            if (employee && !lockRef.current && !inCooldown) {
              lockRef.current = true
              setIsDetecting(false)
              setIsProcessing(true)
              try {
                const attendanceResult = await recordAttendance(employee.id, confidence)
                setResult({ employee, attendance: attendanceResult, confidence })
                setResultSticky(true)
                cooldownRef.current.set(employee.id, Date.now() + FACE_COOLDOWN_MS)
                queryClient.invalidateQueries({ queryKey: ['kiosk-stats'] })
              } catch (err) {
                console.error('Attendance error:', err)
                lockRef.current = false
              } finally {
                setIsProcessing(false)
              }
            }
          } else {
            // No match - show briefly
            if (!lockRef.current) {
              lockRef.current = true
              setNoMatch(true)
              setIsDetecting(false)
              setTimeout(() => { setNoMatch(false); lockRef.current = false }, 3000)
            }
          }
        }
      } else {
        setIsDetecting(false)
      }
    } catch {
      // continue
    }

    animFrameRef.current = requestAnimationFrame(() => setTimeout(detect, 800))
  }, [isReady, faceData, queryClient])

  useEffect(() => {
    if (isReady) detect()
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [isReady, detect])

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="FaceAttend" className="h-10 w-10" />
          <div className="flex flex-col leading-tight">
            <span className="text-brand font-bold text-xl">FaceAttend</span>
            <Link
              href="/kiosk"
              className="text-[#94A3B8] text-xs hover:text-white transition-colors"
              title="Switch office"
            >
              {office.name} <span className="opacity-60">↗</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setRegisterOpen(true)}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            First time? Register
          </Button>
          <div className="text-right">
            <p className="text-white text-lg font-mono font-semibold">{currentTime}</p>
            <p className="text-[#94A3B8] text-sm">{currentDate}</p>
          </div>
        </div>
      </header>

      {/* Camera Area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <div className="relative w-full max-w-2xl aspect-[4/3]">
          {/* Scanning Ring */}
          {isDetecting && (
            <div className="absolute -inset-3 rounded-3xl border-2 border-brand animate-scan-ring z-10 pointer-events-none" />
          )}

          {/* Camera Feed */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Loading Overlay */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-brand/30 border-t-brand animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg font-medium">
                    {!modelsLoaded ? 'Loading AI models...' : 'Loading employee data...'}
                  </p>
                  <p className="text-[#94A3B8] text-sm mt-1">Please wait</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-2.5L13.73 4c-.77-.83-1.96-.83-2.73 0L4.07 16.5c-.77.83.2 2.5 1.73 2.5z" />
                    </svg>
                  </div>
                  <p className="text-red-400 text-lg font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full border-4 border-brand/30 border-t-brand animate-spin" />
              </div>
            )}

            {/* Success Result — stays until user taps Home */}
            {result && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm">
                {/* Pulse ring */}
                <div className="absolute w-48 h-48 rounded-full border-2 border-brand animate-pulse-ring" />
                <div className="text-center animate-slide-in max-w-md mx-auto">
                  {result.employee.face_image_url ? (
                    <img
                      src={result.employee.face_image_url}
                      alt={result.employee.name}
                      className="w-28 h-28 rounded-full mx-auto mb-5 object-cover ring-4 ring-brand shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full mx-auto mb-5 bg-brand/20 flex items-center justify-center ring-4 ring-brand">
                      <svg className="w-14 h-14 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}

                  {/* Friendly greeting */}
                  <h2 className="text-white text-3xl font-bold mb-1">
                    Hey, hi {result.employee.name.split(' ')[0]}!
                  </h2>

                  {result.attendance.action === 'check_in' && (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-6 py-2.5">
                        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check-draw" style={{ strokeDasharray: 100 }} />
                        </svg>
                        <span className="text-emerald-300 text-lg font-semibold">
                          You have logged in{result.attendance.status === 'late' ? ' (Late)' : ''}
                          {result.attendance.time && ` at ${formatTime(result.attendance.time, office.timezone)}`}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] text-sm mt-2">Have a great day!</p>
                    </div>
                  )}
                  {result.attendance.action === 'check_out' && (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-6 py-2.5">
                        <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-check-draw" style={{ strokeDasharray: 100 }} />
                        </svg>
                        <span className="text-blue-300 text-lg font-semibold">
                          You have checked out{result.attendance.time && ` at ${formatTime(result.attendance.time, office.timezone)}`}
                        </span>
                      </div>
                      {result.attendance.check_in_time && (
                        <p className="text-[#94A3B8] text-sm mt-2">
                          Checked in at {formatTime(result.attendance.check_in_time, office.timezone)} — see you tomorrow!
                        </p>
                      )}
                    </div>
                  )}
                  {result.attendance.action === 'still_checked_in' && (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-6 py-2.5">
                        <span className="text-amber-300 text-lg font-semibold">
                          You&apos;re checked in{result.attendance.check_in_time && ` since ${formatTime(result.attendance.check_in_time, office.timezone)}`}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] text-sm mt-2">
                        Minimum {result.attendance.min_work_minutes ?? 1} min before check-out
                        {result.attendance.minutes_so_far !== undefined && ` (${result.attendance.minutes_so_far} min so far)`}
                      </p>
                    </div>
                  )}
                  {(result.attendance.action === 'all_done_today' || result.attendance.action === 'already_complete') && (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-6 py-2.5">
                        <span className="text-white/80 text-lg font-semibold">All done for today!</span>
                      </div>
                      {result.attendance.check_in_time && result.attendance.check_out_time && (
                        <p className="text-[#94A3B8] text-sm mt-2">
                          {formatTime(result.attendance.check_in_time, office.timezone)} → {formatTime(result.attendance.check_out_time, office.timezone)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-4 mt-6">
                    {(result.attendance.action === 'check_in' || result.attendance.action === 'still_checked_in') && (
                      <Button
                        variant="outline"
                        className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 px-6 py-2.5 text-base"
                        onClick={async () => {
                          try {
                            const attendanceResult = await recordAttendance(result.employee.id, result.confidence)
                            setResult({ ...result, attendance: attendanceResult })
                            queryClient.invalidateQueries({ queryKey: ['kiosk-stats'] })
                          } catch (err) {
                            console.error('Check-out error:', err)
                          }
                        }}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Check Out
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white px-6 py-2.5 text-base"
                      onClick={() => {
                        setResult(null)
                        setResultSticky(false)
                        lockRef.current = false
                      }}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Home
                    </Button>
                  </div>

                  <p className="text-[#94A3B8]/60 text-xs mt-4">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* No Match */}
            {noMatch && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
                <div className="absolute w-48 h-48 rounded-full border-2 border-red-500 animate-pulse-ring" />
                <div className="text-center animate-slide-in">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-red-500/20 flex items-center justify-center ring-4 ring-red-500">
                    <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-white text-2xl font-bold mb-1">Face Not Recognized</h2>
                  <p className="text-[#94A3B8] mb-4">New here? Register yourself below.</p>
                  <Button onClick={() => setRegisterOpen(true)} className="bg-brand hover:bg-brand/90">
                    Register Me
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status indicator below camera */}
          <div className="mt-4 text-center">
            {isReady && !result && !noMatch && !resultSticky ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <p className="text-brand font-medium">Ready - Look at the camera</p>
              </div>
            ) : !isReady && !error ? (
              <p className="text-[#94A3B8]">Initializing...</p>
            ) : null}
            {faceData.length === 0 && modelsLoaded && (
              <p className="text-amber-400 text-sm mt-1">
                No one is enrolled yet. Tap <span className="font-semibold">First time? Register</span> above to enroll.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <footer className="border-t border-white/5 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <StatPill
              label="Checked in today"
              value={stats ? String(stats.checked_in_today) : '—'}
              tone="brand"
            />
            <StatPill
              label="Currently in office"
              value={stats ? String(stats.currently_in_office) : '—'}
              tone="emerald"
              live
            />
            <StatPill
              label="Avg check-in"
              value={
                stats && stats.avg_check_in_minutes !== null
                  ? formatMinutesOfDay(stats.avg_check_in_minutes)
                  : '—'
              }
              tone="muted"
            />
          </div>
          <p className="text-[#94A3B8] text-xs">
            Powered by <span className="text-brand font-medium">FaceAttend</span>
          </p>
        </div>
      </footer>

      <KioskRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        office={office}
        onRegistered={() => {
          queryClient.invalidateQueries({ queryKey: ['face-descriptors', office.id] })
          queryClient.invalidateQueries({ queryKey: ['kiosk-stats', office.id] })
        }}
      />
    </div>
  )
}
