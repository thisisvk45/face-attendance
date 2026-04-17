import * as faceapi from 'face-api.js'

let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return
  const MODEL_URL = '/models'
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
  modelsLoaded = true
}

export function buildLabeledDescriptors(
  faceData: { id: string; name: string; face_descriptor: number[] }[]
): faceapi.LabeledFaceDescriptors[] {
  return faceData
    .filter((d) => d.face_descriptor && d.face_descriptor.length === 128)
    .map(
      (d) =>
        new faceapi.LabeledFaceDescriptors(d.id, [
          new Float32Array(d.face_descriptor),
        ])
    )
}

export async function detectFace(
  video: HTMLVideoElement
) {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  return detection || null
}

export async function extractDescriptors(
  video: HTMLVideoElement,
  numCaptures: number = 3,
  delayMs: number = 500
): Promise<Float32Array[]> {
  const descriptors: Float32Array[] = []
  for (let i = 0; i < numCaptures; i++) {
    const detection = await detectFace(video)
    if (detection) {
      descriptors.push(detection.descriptor)
    }
    if (i < numCaptures - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return descriptors
}

export function averageDescriptors(descriptors: Float32Array[]): number[] {
  if (descriptors.length === 0) return []
  const avg = new Float32Array(128)
  for (const desc of descriptors) {
    for (let i = 0; i < 128; i++) {
      avg[i] += desc[i]
    }
  }
  for (let i = 0; i < 128; i++) {
    avg[i] /= descriptors.length
  }
  return Array.from(avg)
}

/**
 * Eye Aspect Ratio (Soukupová & Čech 2016).
 * Takes the 6 ordered landmarks of one eye and returns a ratio that drops
 * sharply when the eye closes. Open: ~0.25-0.32. Closed: <0.20.
 */
function eyeAspectRatio(eye: { x: number; y: number }[]): number {
  if (eye.length !== 6) return 1
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)
  const [p1, p2, p3, p4, p5, p6] = eye
  const denom = 2 * dist(p1, p4)
  if (denom === 0) return 1
  return (dist(p2, p6) + dist(p3, p5)) / denom
}

/**
 * Mean EAR across both eyes from a 68-point face-api.js landmark set.
 */
export function averageEAR(landmarks: faceapi.FaceLandmarks68): number {
  return (
    (eyeAspectRatio(landmarks.getLeftEye()) + eyeAspectRatio(landmarks.getRightEye())) / 2
  )
}
