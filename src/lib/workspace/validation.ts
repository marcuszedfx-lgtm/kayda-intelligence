import {
  MAX_DETAIL_LENGTH,
  MAX_IMPORT_RECORDS,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_IMPORT_RECORDS,
  WORKSPACE_RECORD_TYPES,
  WorkspaceValidationError,
  type WorkspaceCreateInput,
  type WorkspaceRecordType,
} from './types';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — WORKSPACE VALIDATION
 * =========================================================
 *
 * Untrusted request bodies are parsed here, before any
 * database call. Nothing is coerced into an acceptable shape
 * silently: invalid input is rejected with a precise message,
 * and over-long or oversized input is capped rather than
 * truncated without telling the caller.
 * =========================================================
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/** Collapses control characters and trims surrounding space. */
function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim();
}

export function isWorkspaceRecordType(
  value: unknown,
): value is WorkspaceRecordType {
  return (
    typeof value === 'string' &&
    (WORKSPACE_RECORD_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Parses a create request.
 *
 * Accepted shape:
 *   { "type": "tasks", "title": "...", "detail": "..." }
 */
export function parseCreateWorkspaceInput(
  body: unknown,
): WorkspaceCreateInput {
  if (!isRecord(body)) {
    throw new WorkspaceValidationError(
      'Request body must be a JSON object.',
    );
  }

  if (!isWorkspaceRecordType(body.type)) {
    throw new WorkspaceValidationError(
      `Field "type" must be one of: ${WORKSPACE_RECORD_TYPES.join(', ')}.`,
    );
  }

  if (typeof body.title !== 'string') {
    throw new WorkspaceValidationError(
      'Field "title" must be a string.',
    );
  }

  const title = cleanText(body.title);

  if (!title) {
    throw new WorkspaceValidationError(
      'Field "title" must not be empty.',
    );
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new WorkspaceValidationError(
      `Field "title" must be at most ${MAX_TITLE_LENGTH} characters.`,
    );
  }

  if (
    body.detail !== undefined &&
    body.detail !== null &&
    typeof body.detail !== 'string'
  ) {
    throw new WorkspaceValidationError(
      'Field "detail" must be a string when present.',
    );
  }

  const detail =
    typeof body.detail === 'string' ? cleanText(body.detail) : '';

  if (detail.length > MAX_DETAIL_LENGTH) {
    throw new WorkspaceValidationError(
      `Field "detail" must be at most ${MAX_DETAIL_LENGTH} characters.`,
    );
  }

  return { type: body.type, title, detail };
}

export type LegacyCollectionKey =
  | 'businesses'
  | 'contacts'
  | 'deals'
  | 'projects'
  | 'tasks'
  | 'activities';

export type LegacyCollections = Record<
  LegacyCollectionKey,
  Array<Record<string, unknown>>
>;

const LEGACY_KEYS: LegacyCollectionKey[] = [
  'businesses',
  'contacts',
  'deals',
  'projects',
  'tasks',
  'activities',
];

/**
 * Parses a legacy browser-storage snapshot for one-time
 * import. `priorities` is accepted but ignored: there is no
 * Priority model and Stage 3 does not add one.
 */
export function parseLegacyCollections(
  body: unknown,
): LegacyCollections {
  if (!isRecord(body)) {
    throw new WorkspaceValidationError(
      'Import body must be a JSON object.',
    );
  }

  const state = isRecord(body.state) ? body.state : body;

  const collections = {} as LegacyCollections;
  let total = 0;

  for (const key of LEGACY_KEYS) {
    const raw = state[key];

    if (raw === undefined || raw === null) {
      collections[key] = [];
      continue;
    }

    if (!Array.isArray(raw)) {
      throw new WorkspaceValidationError(
        `Field "${key}" must be an array.`,
      );
    }

    if (raw.length > MAX_IMPORT_RECORDS) {
      throw new WorkspaceValidationError(
        `Field "${key}" must contain at most ${MAX_IMPORT_RECORDS} records.`,
      );
    }

    total += raw.length;

    if (total > MAX_TOTAL_IMPORT_RECORDS) {
      throw new WorkspaceValidationError(
        `The import must contain at most ${MAX_TOTAL_IMPORT_RECORDS} records in total.`,
      );
    }

    const records: Array<Record<string, unknown>> = [];

    for (const [index, item] of raw.entries()) {
      if (!isRecord(item)) {
        throw new WorkspaceValidationError(
          `${key}[${index}] must be an object.`,
        );
      }

      records.push(item);
    }

    collections[key] = records;
  }

  return collections;
}
