// Mock BMS SOAP service generated from server/wsdl/BMS_System.wsdl.
// Used by e2e tests and by `npm run mock:bms` for local UI development.
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as soap from 'soap';

export interface RecordedCall {
  operation: string;
  args: any;
}

export interface MockBms {
  server: Server;
  url: string;
  calls: RecordedCall[];
  close(): Promise<void>;
}

const PATH = '/BMS_SystemIISHost/BMS_System.svc';
const wsdlPath = resolve(import.meta.dirname, '..', 'wsdl', 'BMS_System.wsdl');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Special SSN values trigger behaviours:
 *  DUP -> UniqueRegistrationIDError, FAULT -> SOAP fault, SLOW -> 2s delay, NOMATCH -> not verified/identified
 */
export async function startMockBms(port = 0): Promise<MockBms> {
  const calls: RecordedCall[] = [];
  const rec = (operation: string, args: any) => calls.push({ operation, args });

  const guard = async (ssn: string | undefined) => {
    if (ssn === 'FAULT') throw new Error('boom');
    if (ssn === 'SLOW') await sleep(2000);
  };
  const match = (ssn: string, applicationFormId = 'AF-1') => ({
    DataRegistrationID: { ApplicationFormID: applicationFormId, SSN: ssn },
    Score: 87,
  });

  const impl = {
    async AddFace(args: any) {
      rec('AddFace', args);
      const ssn = args.dataRegistrationID?.SSN;
      await guard(ssn);
      return { AddFaceResult: ssn === 'DUP' ? 'UniqueRegistrationIDError' : 'OK' };
    },
    async AddFingerprints(args: any) {
      rec('AddFingerprints', args);
      const ssn = args.dataRegistrationID?.SSN;
      await guard(ssn);
      return { AddFingerprintsResult: ssn === 'DUP' ? 'UniqueRegistrationIDError' : 'OK' };
    },
    async DeleteFace(args: any) {
      rec('DeleteFace', args);
      await guard(args.dataRegistrationID?.SSN);
      return { DeleteFaceResult: 'OK' };
    },
    async DeleteFingerprints(args: any) {
      rec('DeleteFingerprints', args);
      await guard(args.dataRegistrationID?.SSN);
      return { DeleteFingerprintsResult: 'OK' };
    },
    async VerifyFace(args: any) {
      rec('VerifyFace', args);
      await guard(args.SSN);
      const no = args.SSN === 'NOMATCH';
      return {
        VerifyFaceResult: no ? 'NotVerified' : 'Verified',
        bmsMatchingThreshold: args.bmsMatchingThreshold,
        result: match(args.SSN),
      };
    },
    async VerifyFingerprints(args: any) {
      rec('VerifyFingerprints', args);
      await guard(args.SSN);
      const no = args.SSN === 'NOMATCH';
      return {
        VerifyFingerprintsResult: no ? 'NotVerified' : 'Verified',
        bmsMatchingThreshold: args.bmsMatchingThreshold,
        result: match(args.SSN),
      };
    },
    async IdentifyFace(args: any) {
      rec('IdentifyFace', args);
      return {
        IdentifyFaceResult: 'Identified',
        bmsMatchingThreshold: args.bmsMatchingThreshold,
        results: { CMatchingResult: [match('111'), match('222', 'AF-2')] },
      };
    },
    async IdentifyFingerprints(args: any) {
      rec('IdentifyFingerprints', args);
      return {
        IdentifyFingerprintsResult: 'Identified',
        bmsMatchingThreshold: args.bmsMatchingThreshold,
        // single hit: soap collapses 1-element arrays into an object on the wire
        results: { CMatchingResult: match('111') },
      };
    },
    async CreateFIR(args: any) {
      rec('CreateFIR', args);
      return { CreateFIRResult: 'OK', firStructure: Buffer.from('FIR-BYTES').toString('base64') };
    },
    async GetBMSServerInformation(args: any) {
      rec('GetBMSServerInformation', args);
      return { GetBMSServerInformationResult: true, details: 'mock-bms 1.0' };
    },
  };

  const server = createServer((_req, res) => {
    res.statusCode = 404;
    res.end();
  });
  soap.listen(server, {
    path: PATH,
    xml: readFileSync(wsdlPath, 'utf8'),
    services: { BMS_WCFService: { BMS_HTTP: impl, BMS_HTTPS: impl } },
    uri: wsdlPath,
  } as any);
  await new Promise<void>((ok) => server.listen(port, '127.0.0.1', ok));
  const addr = server.address() as { port: number };
  return {
    server,
    calls,
    url: `http://127.0.0.1:${addr.port}${PATH}`,
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}

if (process.argv[1]?.endsWith('mock-bms.ts')) {
  const m = await startMockBms(Number(process.env.MOCK_BMS_PORT ?? 8099));
  console.log(`Mock BMS listening at ${m.url}  (wsdl: ${m.url}?wsdl)`);
}
