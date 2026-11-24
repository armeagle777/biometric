/** BMS could not be reached, timed out, or answered with a SOAP fault. */
export class BmsTransportError extends Error {
  constructor(
    message: string,
    readonly kind: 'unreachable' | 'timeout' | 'fault' | 'bad-response',
    readonly operation: string,
  ) {
    super(message);
    this.name = 'BmsTransportError';
  }
}
