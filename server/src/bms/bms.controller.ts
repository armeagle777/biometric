import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { BmsClientService } from './bms-client.service.js';
import { BmsRequestValidator } from './bms-request-validator.service.js';

/** Every route is a thin JSON wrapper around one BMS SOAP operation. */
@Controller('bms')
export class BmsController {
  constructor(
    private readonly bms: BmsClientService,
    private readonly v: BmsRequestValidator,
  ) {}

  @Get('info')
  info() {
    return this.bms.getServerInformation();
  }

  @Post('face/add')
  @HttpCode(200)
  addFace(@Body() body: unknown) {
    return this.bms.addFace(this.v.parse('addFace', body));
  }

  @Post('face/delete')
  @HttpCode(200)
  deleteFace(@Body() body: unknown) {
    return this.bms.deleteFace(this.v.parse('registrationOnly', body));
  }

  @Post('face/verify')
  @HttpCode(200)
  verifyFace(@Body() body: unknown) {
    return this.bms.verifyFace(this.v.parse('verifyFace', body));
  }

  @Post('face/identify')
  @HttpCode(200)
  identifyFace(@Body() body: unknown) {
    return this.bms.identifyFace(this.v.parse('identifyFace', body));
  }

  @Post('fingerprints/add')
  @HttpCode(200)
  addFingerprints(@Body() body: unknown) {
    return this.bms.addFingerprints(this.v.parse('addFingerprints', body));
  }

  @Post('fingerprints/delete')
  @HttpCode(200)
  deleteFingerprints(@Body() body: unknown) {
    return this.bms.deleteFingerprints(this.v.parse('registrationOnly', body));
  }

  @Post('fingerprints/verify')
  @HttpCode(200)
  verifyFingerprints(@Body() body: unknown) {
    return this.bms.verifyFingerprints(this.v.parse('verifyFingerprints', body));
  }

  @Post('fingerprints/identify')
  @HttpCode(200)
  identifyFingerprints(@Body() body: unknown) {
    return this.bms.identifyFingerprints(this.v.parse('identifyFingerprints', body));
  }

  @Post('fir')
  @HttpCode(200)
  createFir(@Body() body: unknown) {
    return this.bms.createFir(this.v.parse('createFir', body));
  }
}
