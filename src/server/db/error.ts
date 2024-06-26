// A File Exporting Custom Error Classes for DB Operations

// Not Found
export class NotFoundInDbError extends Error {
  constructor(
    public entity: string,
    public entityId: string,
  ) {
    super(`Unable to find ${entity} with id (${entityId})`);
    this.name = 'NotFoundInDbError';
  }
}

export class EmptyPatchError extends Error {
  constructor() {
    super('No fields to update');
    this.name = 'EmptyPatchError';
  }
}
