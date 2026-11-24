import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { startMockBms, type MockBms } from './mock-bms.js';

const png = Buffer.from('fake-png-bytes').toString('base64');
const wsq = Buffer.from('fake-wsq-bytes').toString('base64');
const face = { data: png, format: 'PNG' };
const finger = { data: wsq, format: 'WSQ', position: 'RightIndex' };
const regId = { applicationFormId: 'AF-1', ssn: '1234567890' };

describe('BMS gateway (e2e, against mock SOAP server)', () => {
  let mock: MockBms;
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    mock = await startMockBms();
    process.env.BMS_ENDPOINT = mock.url;
    process.env.BMS_TIMEOUT_MS = '500';
    process.env.BMS_MAX_IMAGE_BYTES = '1024';
    process.env.BMS_DEFAULT_THRESHOLD = '';
    process.env.THROTTLE_LIMIT = '1000';
    // ConfigModule reads process.env when app.module is evaluated, so import it only now.
    const { AppModule } = await import('../src/app.module.js');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    await mock?.close();
  });

  beforeEach(() => {
    mock.calls.length = 0;
  });

  it('GET /info', async () => {
    const res = await http.get('/api/bms/info').expect(200);
    expect(res.body).toEqual({ available: true, details: 'mock-bms 1.0', errorDescription: null });
  });

  it('adds a face and sends the SOAP shape the WSDL expects', async () => {
    const res = await http.post('/api/bms/face/add').send({ registrationId: regId, image: face }).expect(200);
    expect(res.body).toEqual({ status: 'OK', errorDescription: null });
    expect(mock.calls[0].operation).toBe('AddFace');
    expect(mock.calls[0].args.dataRegistrationID).toEqual({ ApplicationFormID: 'AF-1', SSN: '1234567890' });
    expect(mock.calls[0].args.faceImage.ImageDataFormat).toBe('PNG');
    expect(Buffer.from(mock.calls[0].args.faceImage.ImageData, 'base64').toString()).toBe('fake-png-bytes');
  });

  it('returns business statuses with HTTP 200', async () => {
    const res = await http
      .post('/api/bms/face/add')
      .send({ registrationId: { ...regId, ssn: 'DUP' }, image: face })
      .expect(200);
    expect(res.body.status).toBe('UniqueRegistrationIDError');
  });

  it('accepts a data URL for images', async () => {
    await http
      .post('/api/bms/face/add')
      .send({ registrationId: regId, image: { ...face, data: `data:image/png;base64,${png}` } })
      .expect(200);
    expect(Buffer.from(mock.calls[0].args.faceImage.ImageData, 'base64').toString()).toBe('fake-png-bytes');
  });

  it('adds fingerprints with positions', async () => {
    const res = await http
      .post('/api/bms/fingerprints/add')
      .send({ registrationId: regId, images: [finger, { ...finger, position: 'LeftThumb' }] })
      .expect(200);
    expect(res.body.status).toBe('OK');
    const imgs = [].concat(mock.calls[0].args.fingerprintImages.CFingerprintImage);
    expect(imgs.map((i: any) => i.ImageFingerPosition)).toEqual(['RightIndex', 'LeftThumb']);
  });

  it('deletes face and fingerprints', async () => {
    await http.post('/api/bms/face/delete').send({ registrationId: regId }).expect(200, { status: 'OK', errorDescription: null });
    await http.post('/api/bms/fingerprints/delete').send({ registrationId: regId }).expect(200, { status: 'OK', errorDescription: null });
  });

  it('verifies a face', async () => {
    const res = await http.post('/api/bms/face/verify').send({ ssn: '111', image: face, threshold: 40 }).expect(200);
    expect(res.body).toEqual({
      status: 'Verified',
      threshold: 40,
      result: { applicationFormId: 'AF-1', ssn: '111', score: 87 },
      errorDescription: null,
    });
  });

  it('reports NotVerified for fingerprints', async () => {
    const res = await http
      .post('/api/bms/fingerprints/verify')
      .send({ ssn: 'NOMATCH', images: [finger], threshold: 40 })
      .expect(200);
    expect(res.body.status).toBe('NotVerified');
  });

  it('identifies a face (list) and fingerprints (single hit normalised to a list)', async () => {
    const f = await http.post('/api/bms/face/identify').send({ image: face, threshold: 30 }).expect(200);
    expect(f.body.results).toHaveLength(2);
    expect(mock.calls[0].args.resultListLimit).toBe(10);
    const p = await http.post('/api/bms/fingerprints/identify').send({ images: [finger], threshold: 30, resultListLimit: 3 }).expect(200);
    expect(p.body.results).toEqual([{ applicationFormId: 'AF-1', ssn: '111', score: 87 }]);
    expect(mock.calls[1].args.resultListLimit).toBe(3);
  });

  it('creates a FIR', async () => {
    const res = await http.post('/api/bms/fir').send({ images: [finger] }).expect(200);
    expect(res.body.status).toBe('OK');
    expect(Buffer.from(res.body.firStructure, 'base64').toString()).toBe('FIR-BYTES');
  });

  describe('validation', () => {
    it('rejects bad base64, unknown format, oversize image', async () => {
      const bad = await http.post('/api/bms/face/add').send({ registrationId: regId, image: { data: '!!', format: 'PNG' } }).expect(400);
      expect(bad.body.issues[0].path).toBe('image.data');
      await http.post('/api/bms/face/add').send({ registrationId: regId, image: { data: png, format: 'GIF' } }).expect(400);
      const big = Buffer.alloc(2048).toString('base64');
      await http.post('/api/bms/face/add').send({ registrationId: regId, image: { data: big, format: 'PNG' } }).expect(400);
      expect(mock.calls).toHaveLength(0);
    });

    it('requires a threshold when no default is configured', async () => {
      const res = await http.post('/api/bms/face/verify').send({ ssn: '111', image: face }).expect(400);
      expect(res.body.message).toMatch(/threshold/);
      expect(mock.calls).toHaveLength(0);
    });
  });

  describe('transport errors', () => {
    it('maps a SOAP fault to 502', async () => {
      const res = await http.post('/api/bms/face/delete').send({ registrationId: { ...regId, ssn: 'FAULT' } }).expect(502);
      expect(res.body.kind).toBe('fault');
    });

    it('maps a timeout to 504', async () => {
      const res = await http.post('/api/bms/face/delete').send({ registrationId: { ...regId, ssn: 'SLOW' } }).expect(504);
      expect(res.body.kind).toBe('timeout');
    });
  });
});
