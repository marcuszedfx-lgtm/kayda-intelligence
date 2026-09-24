import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import type { IncomingHttpHeaders } from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

export type SourceTransportErrorCode =
  | 'INVALID_URL'
  | 'UNSAFE_URL'
  | 'DNS_ERROR'
  | 'UNSAFE_REDIRECT'
  | 'REDIRECT_LIMIT'
  | 'BODY_TOO_LARGE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CONFIGURATION_ERROR';

export class SourceTransportError extends Error {
  constructor(
    public readonly code: SourceTransportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SourceTransportError';
  }
}

export type SourceTransportProtection =
  | 'authentication_required'
  | 'access_forbidden'
  | 'rate_limited'
  | 'anti_bot_challenge';

export interface SourceTransportResponse {
  status: number;
  statusText: string;
  ok: boolean;
  contentType: string;
  finalUrl: string;
  body: string;
  bodyBytes: number;
  redirectCount: number;
  protected: boolean;
  protection?: SourceTransportProtection;
}

export interface SourceTransportOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodyBytes?: number;
  headers?: Record<string, string>;
  caFile?: string;
}

export interface SourceTransportAddress {
  address: string;
  family: 4 | 6;
}

export interface SourceTransportRequest {
  url: URL;
  address: SourceTransportAddress;
  timeoutMs: number;
  headers: Record<string, string>;
  caFile?: string;
}

export interface SourceTransportRawResponse {
  status: number;
  statusText: string;
  headers: IncomingHttpHeaders;
  body: AsyncIterable<Uint8Array>;
  discard?: () => void;
}

export interface SourceTransportDependencies {
  resolveHostname?: (
    hostname: string,
  ) => Promise<SourceTransportAddress[]>;
  request?: (
    request: SourceTransportRequest,
  ) => Promise<SourceTransportRawResponse>;
}

export interface SourceTransport {
  fetchSource(
    url: string,
    options?: SourceTransportOptions,
  ): Promise<SourceTransportResponse>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BODY_BYTES = 1_000_000;

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Kayda-Intelligence/1.5',
  Accept:
    'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.9',
};

const BLOCKED_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
]);

const blockedAddresses = new BlockList();

for (const [network, prefix, type] of [
  ['0.0.0.0', 8, 'ipv4'],
  ['10.0.0.0', 8, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'],
  ['192.0.2.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['198.18.0.0', 15, 'ipv4'],
  ['198.51.100.0', 24, 'ipv4'],
  ['203.0.113.0', 24, 'ipv4'],
  ['224.0.0.0', 4, 'ipv4'],
  ['240.0.0.0', 4, 'ipv4'],
  ['::', 128, 'ipv6'],
  ['::1', 128, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'],
  ['100::', 64, 'ipv6'],
  ['2001:db8::', 32, 'ipv6'],
  ['fc00::', 7, 'ipv6'],
  ['fe80::', 10, 'ipv6'],
  ['ff00::', 8, 'ipv6'],
] as const) {
  blockedAddresses.addSubnet(network, prefix, type);
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '');
}

function isUnsafeIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  const family = isIP(normalized);

  if (family === 0) {
    return true;
  }

  return blockedAddresses.check(
    normalized,
    family === 4 ? 'ipv4' : 'ipv6',
  );
}

function parseSourceUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new SourceTransportError(
      'INVALID_URL',
      'Source URL is malformed.',
    );
  }

  if (url.protocol !== 'https:') {
    throw new SourceTransportError(
      'UNSAFE_URL',
      'V1.5 source transport only permits HTTPS URLs.',
    );
  }

  if (!url.hostname) {
    throw new SourceTransportError(
      'INVALID_URL',
      'Source URL must include a hostname.',
    );
  }

  if (url.username || url.password) {
    throw new SourceTransportError(
      'UNSAFE_URL',
      'Source URL credentials are not permitted.',
    );
  }

  if (url.port && url.port !== '443') {
    throw new SourceTransportError(
      'UNSAFE_URL',
      'Source URL must use the default HTTPS port.',
    );
  }

  return url;
}

async function resolveHostname(
  hostname: string,
): Promise<SourceTransportAddress[]> {
  const normalizedHostname = normalizeHostname(hostname);
  const literalFamily = isIP(normalizedHostname);

  if (literalFamily === 4 || literalFamily === 6) {
    return [
      {
        address: normalizedHostname,
        family: literalFamily,
      },
    ];
  }

  const addresses = await lookup(normalizedHostname, {
    all: true,
    verbatim: true,
  });

  return addresses.map((address) => ({
    address: address.address,
    family: address.family === 6 ? 6 : 4,
  }));
}

async function resolveSafeAddress(
  hostname: string,
  resolver: (
    hostname: string,
  ) => Promise<SourceTransportAddress[]>,
): Promise<SourceTransportAddress> {
  let addresses: SourceTransportAddress[];

  try {
    addresses = await resolver(
      normalizeHostname(hostname),
    );
  } catch (error) {
    throw new SourceTransportError(
      'DNS_ERROR',
      `Unable to resolve source host: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!addresses.length) {
    throw new SourceTransportError(
      'DNS_ERROR',
      'Source host did not resolve to an address.',
    );
  }

  const unsafeAddress = addresses.find(
    (address) =>
      (address.family !== 4 && address.family !== 6) ||
      isUnsafeIpAddress(address.address),
  );

  if (unsafeAddress) {
    throw new SourceTransportError(
      'UNSAFE_URL',
      `Source host resolved to an unsafe network address: ${unsafeAddress.address}`,
    );
  }

  return addresses[0];
}

function mergeHeaders(
  headers: Record<string, string> | undefined,
  host: string,
): Record<string, string> {
  const safeHeaders = Object.fromEntries(
    Object.entries(headers ?? {}).filter(
      ([name]) => !BLOCKED_HEADERS.has(name.toLowerCase()),
    ),
  );

  return {
    ...DEFAULT_HEADERS,
    ...safeHeaders,
    Host: host,
  };
}

function resolveOptions(
  options: SourceTransportOptions,
): Required<
  Pick<
    SourceTransportOptions,
    'timeoutMs' | 'maxRedirects' | 'maxBodyBytes'
  >
> {
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects =
    options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBodyBytes =
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new SourceTransportError(
      'CONFIGURATION_ERROR',
      'Source transport timeout must be a positive integer.',
    );
  }

  if (!Number.isInteger(maxRedirects) || maxRedirects < 0) {
    throw new SourceTransportError(
      'CONFIGURATION_ERROR',
      'Source transport redirect limit must be a non-negative integer.',
    );
  }

  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new SourceTransportError(
      'CONFIGURATION_ERROR',
      'Source transport body limit must be a positive integer.',
    );
  }

  return {
    timeoutMs,
    maxRedirects,
    maxBodyBytes,
  };
}

function getHeader(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const match = Object.entries(headers).find(
    ([headerName]) =>
      headerName.toLowerCase() === name.toLowerCase(),
  );

  if (!match || match[1] === undefined) {
    return undefined;
  }

  return Array.isArray(match[1])
    ? match[1].join(', ')
    : match[1];
}

function isRedirectStatus(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function getProtection(
  status: number,
  body: string,
): SourceTransportProtection | undefined {
  if (status === 401) {
    return 'authentication_required';
  }

  if (status === 403) {
    return 'access_forbidden';
  }

  if (status === 429) {
    return 'rate_limited';
  }

  const lowerBody = body.toLowerCase();

  if (
    lowerBody.includes('just a moment') ||
    lowerBody.includes('cf-mitigated') ||
    lowerBody.includes('cf-chl-') ||
    lowerBody.includes('verify you are human') ||
    lowerBody.includes('checking your browser') ||
    lowerBody.includes('captcha challenge')
  ) {
    return 'anti_bot_challenge';
  }

  return undefined;
}

async function readBody(
  body: AsyncIterable<Uint8Array>,
  maxBodyBytes: number,
): Promise<{ body: string; bodyBytes: number }> {
  const chunks: Buffer[] = [];
  let bodyBytes = 0;

  for await (const chunk of body) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);

    bodyBytes += buffer.byteLength;

    if (bodyBytes > maxBodyBytes) {
      throw new SourceTransportError(
        'BODY_TOO_LARGE',
        `Source response exceeded the ${maxBodyBytes}-byte limit.`,
      );
    }

    chunks.push(buffer);
  }

  return {
    body: Buffer.concat(chunks).toString('utf8'),
    bodyBytes,
  };
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof SourceTransportError) {
    return error.code === 'TIMEOUT';
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const code =
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  return code === 'ETIMEDOUT' || /timed out/i.test(error.message);
}

async function requestWithNativeHttps(
  input: SourceTransportRequest,
): Promise<SourceTransportRawResponse> {
  let ca: Buffer | undefined;

  try {
    ca = input.caFile
      ? fs.readFileSync(input.caFile)
      : undefined;
  } catch (error) {
    throw new SourceTransportError(
      'CONFIGURATION_ERROR',
      `Unable to read source CA file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return await new Promise<SourceTransportRawResponse>(
    (resolve, reject) => {
      let responseStarted = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const clearRequestTimeout = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };

      try {
        const request = https.request(
          {
            protocol: 'https:',
            hostname: input.address.address,
            family: input.address.family,
            port: input.url.port || 443,
            path: `${input.url.pathname}${input.url.search}`,
            method: 'GET',
            servername: normalizeHostname(input.url.hostname),
            rejectUnauthorized: true,
            ...(ca ? { ca } : {}),
            headers: input.headers,
          },
          (response) => {
            responseStarted = true;
            response.once('end', clearRequestTimeout);
            response.once('error', clearRequestTimeout);

            resolve({
              status: response.statusCode ?? 0,
              statusText: response.statusMessage ?? '',
              headers: response.headers,
              body: response,
              discard: () => response.resume(),
            });
          },
        );

        timeout = setTimeout(() => {
          request.destroy(
            new SourceTransportError(
              'TIMEOUT',
              `Source request timed out after ${input.timeoutMs}ms.`,
            ),
          );
        }, input.timeoutMs);

        request.once('error', (error) => {
          clearRequestTimeout();

          if (!responseStarted) {
            reject(error);
          }
        });

        request.end();
      } catch (error) {
        clearRequestTimeout();
        reject(error);
      }
    },
  );
}

function createNetworkError(error: unknown): SourceTransportError {
  if (error instanceof SourceTransportError) {
    return error;
  }

  if (isTimeoutError(error)) {
    return new SourceTransportError(
      'TIMEOUT',
      error instanceof Error
        ? error.message
        : 'Source request timed out.',
    );
  }

  return new SourceTransportError(
    'NETWORK_ERROR',
    `Source request failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

export function createSourceTransport(
  dependencies: SourceTransportDependencies = {},
): SourceTransport {
  const resolver =
    dependencies.resolveHostname ?? resolveHostname;
  const requester =
    dependencies.request ?? requestWithNativeHttps;

  return {
    async fetchSource(
      sourceUrl: string,
      options: SourceTransportOptions = {},
    ): Promise<SourceTransportResponse> {
      const configuration = resolveOptions(options);
      let currentUrl = parseSourceUrl(sourceUrl);
      let redirectCount = 0;

      while (true) {
        let address: SourceTransportAddress;

        try {
          address = await resolveSafeAddress(
            currentUrl.hostname,
            resolver,
          );
        } catch (error) {
          if (
            redirectCount > 0 &&
            error instanceof SourceTransportError &&
            error.code === 'UNSAFE_URL'
          ) {
            throw new SourceTransportError(
              'UNSAFE_REDIRECT',
              `Source response redirected to an unsafe URL: ${error.message}`,
            );
          }

          throw error;
        }

        let response: SourceTransportRawResponse;

        try {
          response = await requester({
            url: currentUrl,
            address,
            timeoutMs: configuration.timeoutMs,
            headers: mergeHeaders(
              options.headers,
              currentUrl.host,
            ),
            ...(options.caFile
              ? { caFile: options.caFile }
              : {}),
          });
        } catch (error) {
          throw createNetworkError(error);
        }

        const contentType =
          getHeader(response.headers, 'content-type') ?? '';
        const location = getHeader(
          response.headers,
          'location',
        );

        if (isRedirectStatus(response.status) && location) {
          response.discard?.();

          if (redirectCount >= configuration.maxRedirects) {
            throw new SourceTransportError(
              'REDIRECT_LIMIT',
              `Source request exceeded the ${configuration.maxRedirects}-redirect limit.`,
            );
          }

          let redirectedUrl: URL;

          try {
            redirectedUrl = new URL(location, currentUrl);
            currentUrl = parseSourceUrl(
              redirectedUrl.toString(),
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Malformed redirect URL.';

            throw new SourceTransportError(
              'UNSAFE_REDIRECT',
              `Source response redirected to an unsafe URL: ${message}`,
            );
          }

          redirectCount += 1;
          continue;
        }

        const statusProtection = getProtection(
          response.status,
          '',
        );

        if (statusProtection) {
          response.discard?.();

          return {
            status: response.status,
            statusText: response.statusText,
            ok: false,
            contentType,
            finalUrl: currentUrl.toString(),
            body: '',
            bodyBytes: 0,
            redirectCount,
            protected: true,
            protection: statusProtection,
          };
        }

        let body: string;
        let bodyBytes: number;

        try {
          const readResult = await readBody(
            response.body,
            configuration.maxBodyBytes,
          );
          body = readResult.body;
          bodyBytes = readResult.bodyBytes;
        } catch (error) {
          throw createNetworkError(error);
        }

        const protection = getProtection(response.status, body);

        return {
          status: response.status,
          statusText: response.statusText,
          ok:
            response.status >= 200 &&
            response.status < 300 &&
            !protection,
          contentType,
          finalUrl: currentUrl.toString(),
          body,
          bodyBytes,
          redirectCount,
          protected: Boolean(protection),
          ...(protection ? { protection } : {}),
        };
      }
    },
  };
}

const defaultSourceTransport = createSourceTransport();

export const fetchSource = defaultSourceTransport.fetchSource;

export const fetchSourceWithNativeHttps = fetchSource;
