export class NotImplementedError extends Error {
  constructor(name) {
    super(`${name} is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}
