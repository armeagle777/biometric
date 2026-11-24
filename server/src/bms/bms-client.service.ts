import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from 'soap';
import type { Env } from '../config/env.js';
import type {
  AddFaceDto,
  AddFingerprintsDto,
  CreateFirDto,
  IdentifyFaceDto,
  IdentifyFingerprintsDto,
  RegistrationOnlyDto,
  VerifyFaceDto,
  VerifyFingerprintsDto,
} from './bms.schemas.js';
import { BmsTransportError } from './bms.errors.js';
import type {
  AddingStatus,
  DeletingStatus,
  FaceImage,
  FingerprintImage,
  FirResponse,
  IdentificationStatus,
  IdentifyResponse,
  ImageTaskStatus,
  MatchingResult,
  RegistrationId,
  ServerInfoResponse,
  StatusResponse,
  VerificationStatus,
  VerifyResponse,
} from './bms.types.js';

export const BMS_SOAP_CLIENT = Symbol('BMS_SOAP_CLIENT');

type Raw = Record<string, any>;

@Injectable()
export class BmsClientService {
  private readonly logger = new Logger(BmsClientService.name);

  constructor(
    @Inject(BMS_SOAP_CLIENT) private readonly client: Client,
    private readonly config: ConfigService<Env, true>,
  ) {}

  addFace(dto: AddFaceDto): Promise<StatusResponse<AddingStatus>> {
    return this.call('AddFace', dto.registrationId.ssn, {
      dataRegistrationID: regId(dto.registrationId),
      faceImage: face(dto.image),
    }).then((r) => status(r, 'AddFaceResult'));
  }

  addFingerprints(dto: AddFingerprintsDto): Promise<StatusResponse<AddingStatus>> {
    return this.call('AddFingerprints', dto.registrationId.ssn, {
      dataRegistrationID: regId(dto.registrationId),
      fingerprintImages: fingers(dto.images),
    }).then((r) => status(r, 'AddFingerprintsResult'));
  }

  deleteFace(dto: RegistrationOnlyDto): Promise<StatusResponse<DeletingStatus>> {
    return this.call('DeleteFace', dto.registrationId.ssn, {
      dataRegistrationID: regId(dto.registrationId),
    }).then((r) => status(r, 'DeleteFaceResult'));
  }

  deleteFingerprints(dto: RegistrationOnlyDto): Promise<StatusResponse<DeletingStatus>> {
    return this.call('DeleteFingerprints', dto.registrationId.ssn, {
      dataRegistrationID: regId(dto.registrationId),
    }).then((r) => status(r, 'DeleteFingerprintsResult'));
  }

  verifyFace(dto: VerifyFaceDto): Promise<VerifyResponse> {
    return this.call('VerifyFace', dto.ssn, {
      SSN: dto.ssn,
      faceImage: face(dto.image),
      bmsMatchingThreshold: this.threshold(dto.threshold),
    }).then((r) => verifyResponse(r, 'VerifyFaceResult'));
  }

  verifyFingerprints(dto: VerifyFingerprintsDto): Promise<VerifyResponse> {
    return this.call('VerifyFingerprints', dto.ssn, {
      SSN: dto.ssn,
      fingerprintImages: fingers(dto.images),
      bmsMatchingThreshold: this.threshold(dto.threshold),
    }).then((r) => verifyResponse(r, 'VerifyFingerprintsResult'));
  }

  identifyFace(dto: IdentifyFaceDto): Promise<IdentifyResponse> {
    return this.call('IdentifyFace', undefined, {
      faceImage: face(dto.image),
      resultListLimit: dto.resultListLimit,
      bmsMatchingThreshold: this.threshold(dto.threshold),
    }).then((r) => identifyResponse(r, 'IdentifyFaceResult'));
  }

  identifyFingerprints(dto: IdentifyFingerprintsDto): Promise<IdentifyResponse> {
    return this.call('IdentifyFingerprints', undefined, {
      fingerprintImages: fingers(dto.images),
      resultListLimit: dto.resultListLimit,
      bmsMatchingThreshold: this.threshold(dto.threshold),
    }).then((r) => identifyResponse(r, 'IdentifyFingerprintsResult'));
  }

  createFir(dto: CreateFirDto): Promise<FirResponse> {
    return this.call('CreateFIR', undefined, {
      fingerprintImages: fingers(dto.images),
    }).then((r) => ({
      ...status<ImageTaskStatus>(r, 'CreateFIRResult'),
      firStructure: toBase64(r['firStructure']),
    }));
  }

  getServerInformation(): Promise<ServerInfoResponse> {
    return this.call('GetBMSServerInformation', undefined, {}).then((r) => ({
      available: r['GetBMSServerInformationResult'] === true || r['GetBMSServerInformationResult'] === 'true',
      details: str(r['details']),
      errorDescription: str(r['errorDescription']),
    }));
  }

  private threshold(requested: number | undefined): number {
    const value = requested ?? this.config.get('BMS_DEFAULT_THRESHOLD', { infer: true });
    if (value === undefined) {
      throw new MissingThresholdError();
    }
    return value;
  }

  /** `subject` is only used for logging (never log image data). */
  private async call(operation: string, subject: string | undefined, args: Raw): Promise<Raw> {
    const method = (this.client as unknown as Record<string, unknown>)[`${operation}Async`] as
      | ((args: Raw, options?: Raw) => Promise<[Raw, ...unknown[]]>)
      | undefined;
    if (typeof method !== 'function') {
      throw new BmsTransportError(`Operation ${operation} is not in the WSDL`, 'bad-response', operation);
    }
    const started = Date.now();
    try {
      const [result] = await method.call(this.client, args, {
        timeout: this.config.get('BMS_TIMEOUT_MS', { infer: true }),
      });
      if (result === null || typeof result !== 'object') {
        throw new BmsTransportError('Empty response from BMS', 'bad-response', operation);
      }
      this.logger.log(
        `${operation} ok in ${Date.now() - started}ms${subject ? ` subject=${mask(subject)}` : ''}`,
      );
      return result as Raw;
    } catch (err) {
      const mapped = this.mapError(err, operation);
      this.logger.warn(
        `${operation} failed in ${Date.now() - started}ms: ${mapped.kind}: ${mapped.message}`,
      );
      throw mapped;
    }
  }

  private mapError(err: unknown, operation: string): BmsTransportError {
    if (err instanceof BmsTransportError) return err;
    const e = err as { code?: string; message?: string; root?: unknown; response?: unknown };
    const message = e?.message ?? 'Unknown error';
    if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT' || /timeout/i.test(message)) {
      return new BmsTransportError('BMS request timed out', 'timeout', operation);
    }
    if (e?.root || e?.response) {
      // SOAP fault: keep the text but not the raw body (may echo input).
      return new BmsTransportError(`BMS returned a SOAP fault: ${message}`, 'fault', operation);
    }
    return new BmsTransportError(`BMS unreachable: ${message}`, 'unreachable', operation);
  }
}

export class MissingThresholdError extends Error {
  constructor() {
    super(
      'A matching threshold is required: send "threshold" or set BMS_DEFAULT_THRESHOLD on the server',
    );
  }
}

// ---------- mapping helpers (REST DTO <-> SOAP element shapes) ----------

function regId(r: RegistrationId): Raw {
  return { ApplicationFormID: r.applicationFormId, SSN: r.ssn };
}
function face(i: FaceImage): Raw {
  return { ImageData: i.data, ImageDataFormat: i.format };
}
function fingers(images: FingerprintImage[]): Raw {
  return {
    CFingerprintImage: images.map((i) => ({
      ImageData: i.data,
      ImageDataFormat: i.format,
      ImageFingerPosition: i.position,
    })),
  };
}

function str(v: unknown): string | null {
  return v === undefined || v === null || v === '' ? null : String(v as string | number | boolean);
}
function toBase64(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  return Buffer.isBuffer(v) ? v.toString('base64') : String(v as string);
}
function status<S extends string>(r: Raw, key: string): StatusResponse<S> {
  const s = str(r[key]);
  if (!s) throw new BmsTransportError(`Missing ${key} in BMS response`, 'bad-response', key);
  return { status: s as S, errorDescription: str(r['errorDescription']) };
}
function matching(raw: unknown): MatchingResult | null {
  const m = raw as Raw | null | undefined;
  if (!m || typeof m !== 'object') return null;
  const id = (m['DataRegistrationID'] ?? {}) as Raw;
  return {
    applicationFormId: String(id['ApplicationFormID'] ?? ''),
    ssn: String(id['SSN'] ?? ''),
    score: Number(m['Score'] ?? 0),
  };
}
function num(v: unknown): number | null {
  return v === undefined || v === null || v === '' ? null : Number(v);
}
function verifyResponse(r: Raw, key: string): VerifyResponse {
  return {
    ...status<VerificationStatus>(r, key),
    threshold: num(r['bmsMatchingThreshold']),
    result: matching(r['result']),
  };
}
function identifyResponse(r: Raw, key: string): IdentifyResponse {
  const list = (r['results'] as Raw | null | undefined)?.['CMatchingResult'];
  const items = Array.isArray(list) ? list : list ? [list] : [];
  return {
    ...status<IdentificationStatus>(r, key),
    threshold: num(r['bmsMatchingThreshold']),
    results: items.map(matching).filter((m): m is MatchingResult => m !== null),
  };
}
function mask(s: string): string {
  return s.length <= 4 ? '***' : `${s.slice(0, 2)}***${s.slice(-2)}`;
}
