'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { GuidedFaceCapture } from '@/components/guided-face-capture'
import { getDepartmentsForKiosk, selfEnroll } from '@/app/kiosk/actions'
import type { Department, Office } from '@/lib/types'

interface KioskRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  office: Office
  onRegistered: () => void
}

type Step = 'form' | 'consent' | 'capture' | 'saving' | 'done'

export function KioskRegisterDialog({ open, onOpenChange, office, onRegistered }: KioskRegisterDialogProps) {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentedAt, setConsentedAt] = useState<string | null>(null)

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['kiosk-departments'],
    queryFn: () => getDepartmentsForKiosk(),
    enabled: open,
  })

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('form')
        setName('')
        setEmployeeCode('')
        setDepartment('')
        setRole('')
        setError(null)
        setSavedName('')
        setConsentChecked(false)
        setConsentedAt(null)
      }, 300)
    }
  }, [open])

  function handleContinueToCapture() {
    setError(null)
    if (!name.trim()) return setError('Please enter your name.')
    if (!employeeCode.trim()) return setError('Please enter your employee code.')
    if (!department) return setError('Please select a department.')
    setStep('consent')
  }

  function handleConsent() {
    if (!consentChecked) return
    setConsentedAt(new Date().toISOString())
    setStep('capture')
  }

  async function handleCaptureComplete(descriptor: number[], imageBase64: string) {
    if (!consentedAt) {
      setError('Consent is required. Please restart registration.')
      setStep('form')
      return
    }
    setStep('saving')
    setError(null)
    try {
      const result = await selfEnroll({
        name: name.trim(),
        employee_code: employeeCode.trim(),
        department,
        role: role.trim() || null,
        office_id: office.id,
        face_descriptor: descriptor,
        face_image_base64: imageBase64,
        consented_at: consentedAt,
      })
      if (!result.ok) {
        setError(result.error)
        setStep('form')
        return
      }
      setSavedName(result.employee.name)
      setStep('done')
      onRegistered()
    } catch (err) {
      console.error('[kiosk-register] selfEnroll threw:', err)
      setError('Registration failed. Please try again.')
      setStep('form')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'form' && 'Register yourself'}
            {step === 'consent' && 'Biometric data consent'}
            {step === 'capture' && 'Face enrollment'}
            {step === 'saving' && 'Saving…'}
            {step === 'done' && 'You are registered!'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
              You are registering at <span className="font-semibold text-slate-900">{office.name}</span>.
              Wrong office? <a href="/kiosk" className="text-brand underline">Switch</a>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vikas Kumar"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Employee code</Label>
              <Input
                id="code"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP001"
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder={departments.length === 0 ? 'No departments found' : 'Select a department'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Ask the admin to create departments first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role (optional)</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleContinueToCapture}
                className="flex-1"
                disabled={departments.length === 0}
              >
                Continue to face capture
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'consent' && (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-3 max-h-72 overflow-y-auto">
              <p className="font-semibold text-slate-900">
                We need your explicit consent to process your face data.
              </p>
              <p>
                To enable face-based attendance, we will capture images of your face and store a
                mathematical representation (a 128-number vector called a &quot;face descriptor&quot;)
                derived from those images.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-medium">Purpose:</span> recognising you at the office kiosk
                  to record check-in and check-out times.
                </li>
                <li>
                  <span className="font-medium">What we store:</span> your name, employee code,
                  department, role, one reference photo, and your face descriptor.
                </li>
                <li>
                  <span className="font-medium">Who can see it:</span> only authorised company
                  admins.
                </li>
                <li>
                  <span className="font-medium">Retention:</span> kept while you are an active
                  employee. You may request deletion of your biometric data at any time, after
                  which face login will no longer work for you.
                </li>
                <li>
                  <span className="font-medium">Your rights:</span> you can withdraw consent and
                  request deletion by contacting your administrator. Deletion is logged for audit
                  purposes.
                </li>
              </ul>
              <p className="text-xs text-slate-500">
                By proceeding, you confirm you are voluntarily providing this data and that you are
                the person being enrolled.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                className="mt-1"
              />
              <span className="text-sm text-slate-700">
                I have read and understood the above. I give my explicit consent to the collection
                and processing of my biometric face data for attendance purposes.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConsent}
                disabled={!consentChecked}
                className="flex-1"
              >
                I consent — continue
              </Button>
              <Button variant="outline" onClick={() => setStep('form')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Follow the prompts. We&apos;ll take 5 quick samples of your face from different angles.
            </p>
            <GuidedFaceCapture
              onComplete={handleCaptureComplete}
              onCancel={() => setStep('form')}
            />
          </div>
        )}

        {step === 'saving' && (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin mx-auto mb-4" />
            <p className="text-slate-700">Saving your enrollment…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Welcome, {savedName}!</h3>
            <p className="text-slate-600">
              Please step back from the camera, then walk up again to check in.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
