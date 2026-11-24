// Mirrors server/wsdl/BMS_System.xsd0.xsd (namespace .../Armenia/20120124/v16).

export const FACE_FORMATS = ['JPEG', 'JPEG2000', 'BMP', 'PNG'] as const;
export const FINGERPRINT_FORMATS = ['WSQ', 'JPEG', 'JPEG2000', 'BMP', 'PNG'] as const;
export const FINGER_POSITIONS = [
  'Unknown',
  'RightThumb',
  'RightIndex',
  'RightMiddle',
  'RightRing',
  'RightLittle',
  'LeftThumb',
  'LeftIndex',
  'LeftMiddle',
  'LeftRing',
  'LeftLittle',
] as const;

export type FaceFormat = (typeof FACE_FORMATS)[number];
export type FingerprintFormat = (typeof FINGERPRINT_FORMATS)[number];
export type FingerPosition = (typeof FINGER_POSITIONS)[number];

export type AddingStatus =
  | 'OK'
  | 'TaskFailed'
  | 'ServerNotReady'
  | 'UniqueRegistrationIDError'
  | 'ImageExtractionError';
export type DeletingStatus = 'OK' | 'TaskFailed' | 'ServerNotReady' | 'UniqueRegistrationIDError';
export type VerificationStatus =
  | 'Verified'
  | 'NotVerified'
  | 'TaskFailed'
  | 'ServerNotReady'
  | 'UniqueRegistrationIDError'
  | 'ImageExtractionError';
export type IdentificationStatus =
  | 'Identified'
  | 'NotIdentified'
  | 'TaskFailed'
  | 'ServerNotReady'
  | 'ImageExtractionError';
export type ImageTaskStatus = 'OK' | 'TaskFailed' | 'ServerNotReady' | 'ImageExtractionError';

export interface RegistrationId {
  applicationFormId: string;
  ssn: string;
}

export interface FaceImage {
  /** base64 */
  data: string;
  format: FaceFormat;
}

export interface FingerprintImage {
  /** base64 */
  data: string;
  format: FingerprintFormat;
  position: FingerPosition;
}

export interface MatchingResult {
  applicationFormId: string;
  ssn: string;
  score: number;
}

export interface StatusResponse<S extends string> {
  status: S;
  errorDescription: string | null;
}
export interface VerifyResponse extends StatusResponse<VerificationStatus> {
  threshold: number | null;
  result: MatchingResult | null;
}
export interface IdentifyResponse extends StatusResponse<IdentificationStatus> {
  threshold: number | null;
  results: MatchingResult[];
}
export interface FirResponse extends StatusResponse<ImageTaskStatus> {
  /** base64 */
  firStructure: string | null;
}
export interface ServerInfoResponse {
  available: boolean;
  details: string | null;
  errorDescription: string | null;
}
