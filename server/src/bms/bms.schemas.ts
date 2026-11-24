import { z } from 'zod';
import { FACE_FORMATS, FINGER_POSITIONS, FINGERPRINT_FORMATS } from './bms.types.js';

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Accepts raw base64 or a data URL, returns raw base64. */
function stripDataUrl(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const m = /^data:[^;,]*(?:;[^;,]*)*;base64,/i.exec(v);
  return m ? v.slice(m[0].length) : v;
}

function decodedLength(b64: string): number {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

export function buildSchemas(opts: { maxImageBytes: number; defaultResultLimit: number }) {
  const base64 = z.preprocess(
    stripDataUrl,
    z
      .string()
      .min(1, 'must not be empty')
      .refine((s) => s.length % 4 === 0 && BASE64_RE.test(s), 'must be valid base64')
      .refine((s) => decodedLength(s) <= opts.maxImageBytes, {
        message: `must not exceed ${opts.maxImageBytes} bytes`,
      }),
  );

  const text = (max: number) => z.string().trim().min(1).max(max);

  const registrationId = z.object({
    applicationFormId: text(100),
    ssn: text(50),
  });

  const faceImage = z.object({ data: base64, format: z.enum(FACE_FORMATS) });
  const fingerprintImage = z.object({
    data: base64,
    format: z.enum(FINGERPRINT_FORMATS),
    position: z.enum(FINGER_POSITIONS).default('Unknown'),
  });
  const fingerprintImages = z.array(fingerprintImage).min(1).max(10);
  const threshold = z.number().int().min(0).optional();

  return {
    registrationOnly: z.object({ registrationId }),
    addFace: z.object({ registrationId, image: faceImage }),
    addFingerprints: z.object({ registrationId, images: fingerprintImages }),
    verifyFace: z.object({ ssn: text(50), image: faceImage, threshold }),
    verifyFingerprints: z.object({ ssn: text(50), images: fingerprintImages, threshold }),
    identifyFace: z.object({
      image: faceImage,
      threshold,
      resultListLimit: z.number().int().min(1).max(1000).default(opts.defaultResultLimit),
    }),
    identifyFingerprints: z.object({
      images: fingerprintImages,
      threshold,
      resultListLimit: z.number().int().min(1).max(1000).default(opts.defaultResultLimit),
    }),
    createFir: z.object({ images: fingerprintImages }),
  };
}

export type BmsSchemas = ReturnType<typeof buildSchemas>;
export type AddFaceDto = z.infer<BmsSchemas['addFace']>;
export type AddFingerprintsDto = z.infer<BmsSchemas['addFingerprints']>;
export type RegistrationOnlyDto = z.infer<BmsSchemas['registrationOnly']>;
export type VerifyFaceDto = z.infer<BmsSchemas['verifyFace']>;
export type VerifyFingerprintsDto = z.infer<BmsSchemas['verifyFingerprints']>;
export type IdentifyFaceDto = z.infer<BmsSchemas['identifyFace']>;
export type IdentifyFingerprintsDto = z.infer<BmsSchemas['identifyFingerprints']>;
export type CreateFirDto = z.infer<BmsSchemas['createFir']>;
