import { api } from './client'
import type {
  FaceImage, FingerprintImage, FirResponse, IdentifyResponse, RegistrationId,
  ServerInfo, StatusResponse, VerifyResponse,
} from './types'

export const bms = {
  info: () => api<ServerInfo>('/bms/info'),

  addFace: (registrationId: RegistrationId, image: FaceImage) =>
    api<StatusResponse>('/bms/face/add', { registrationId, image }),
  deleteFace: (registrationId: RegistrationId) =>
    api<StatusResponse>('/bms/face/delete', { registrationId }),
  verifyFace: (ssn: string, image: FaceImage, threshold?: number) =>
    api<VerifyResponse>('/bms/face/verify', { ssn, image, threshold }),
  identifyFace: (image: FaceImage, threshold?: number, resultListLimit?: number) =>
    api<IdentifyResponse>('/bms/face/identify', { image, threshold, resultListLimit }),

  addFingerprints: (registrationId: RegistrationId, images: FingerprintImage[]) =>
    api<StatusResponse>('/bms/fingerprints/add', { registrationId, images }),
  deleteFingerprints: (registrationId: RegistrationId) =>
    api<StatusResponse>('/bms/fingerprints/delete', { registrationId }),
  verifyFingerprints: (ssn: string, images: FingerprintImage[], threshold?: number) =>
    api<VerifyResponse>('/bms/fingerprints/verify', { ssn, images, threshold }),
  identifyFingerprints: (images: FingerprintImage[], threshold?: number, resultListLimit?: number) =>
    api<IdentifyResponse>('/bms/fingerprints/identify', { images, threshold, resultListLimit }),

  createFir: (images: FingerprintImage[]) => api<FirResponse>('/bms/fir', { images }),
}
