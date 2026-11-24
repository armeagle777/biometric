// Mirrors server/src/bms/bms.types.ts (itself derived from server/wsdl/BMS_System.xsd0.xsd).
export const FACE_FORMATS = ['JPEG', 'JPEG2000', 'BMP', 'PNG'] as const
export const FINGERPRINT_FORMATS = ['WSQ', 'JPEG', 'JPEG2000', 'BMP', 'PNG'] as const
export const FINGER_POSITIONS = [
  'Unknown', 'RightThumb', 'RightIndex', 'RightMiddle', 'RightRing', 'RightLittle',
  'LeftThumb', 'LeftIndex', 'LeftMiddle', 'LeftRing', 'LeftLittle',
] as const

export type FaceFormat = (typeof FACE_FORMATS)[number]
export type FingerprintFormat = (typeof FINGERPRINT_FORMATS)[number]
export type FingerPosition = (typeof FINGER_POSITIONS)[number]

export interface RegistrationId { applicationFormId: string; ssn: string }
export interface FaceImage { data: string; format: FaceFormat }
export interface FingerprintImage { data: string; format: FingerprintFormat; position: FingerPosition }
export interface MatchingResult { applicationFormId: string; ssn: string; score: number }

export interface StatusResponse { status: string; errorDescription: string | null }
export interface VerifyResponse extends StatusResponse { threshold: number | null; result: MatchingResult | null }
export interface IdentifyResponse extends StatusResponse { threshold: number | null; results: MatchingResult[] }
export interface FirResponse extends StatusResponse { firStructure: string | null }
export interface ServerInfo { available: boolean; details: string | null; errorDescription: string | null }
