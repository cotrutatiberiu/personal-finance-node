export class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EmailAlreadyUsedError extends AppError {
  constructor(email: string) {
    super(`Email already in use: ${email}`, 409);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid email or password", 401);
  }
}

export class AccountNotFoundError extends AppError {
  constructor(id: string) {
    super(`Account not found: ${id}`, 404);
  }
}

export class ResourceNotFound extends AppError {
  constructor(entity: string) {
    super(`${entity} not found`, 409);
  }
}

export class DuplicateResource extends AppError {
  constructor(entity: string) {
    super(`${entity} already exists`, 409);
  }
}