import { z } from 'zod';

const optionalInt = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  /** Browser origin(s) allowed by CORS, comma separated. */
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  /** Local copy of the BMS WSDL (its XSDs sit next to it). */
  BMS_WSDL_PATH: z.string().default('wsdl/BMS_System.wsdl'),
  /**
   * Endpoint used for SOAP calls. The WSDL lists an HTTP and an HTTPS port and
   * the soap library would pick the first (HTTP), so this is always applied.
   */
  BMS_ENDPOINT: z
    .string()
    .url()
    .default('https://bms.migration.am/BMS_SystemIISHost/BMS_System.svc'),
  BMS_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  /** Max decoded size of one image/template accepted from the client. */
  BMS_MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  /** Used when a verify/identify request does not carry a threshold. */
  BMS_DEFAULT_THRESHOLD: optionalInt,
  BMS_DEFAULT_RESULT_LIMIT: z.coerce.number().int().positive().default(10),
  /** Optional extra HTTP headers for the SOAP call, as a JSON object. */
  BMS_EXTRA_HEADERS: z.string().optional(),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  if (parsed.data.BMS_EXTRA_HEADERS) {
    try {
      JSON.parse(parsed.data.BMS_EXTRA_HEADERS);
    } catch {
      throw new Error('Invalid environment: BMS_EXTRA_HEADERS must be JSON');
    }
  }
  return parsed.data;
}
