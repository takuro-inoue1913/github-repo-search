export class AppError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {}

export class NotFoundError extends AppError {}

export class RateLimitError extends AppError {
  readonly resetAt: Date;
  constructor(message: string, resetAt: Date) {
    super(message);
    this.resetAt = resetAt;
  }
}

export class NetworkError extends AppError {}

export class UnknownApiError extends AppError {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
