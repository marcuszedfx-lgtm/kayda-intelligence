import assert from 'node:assert/strict';
import {
  createSourceTransport,
  SourceTransportError,
  type SourceTransportRawResponse,
} from './source-transport';

const publicAddress = {
  address: '93.184.216.34',
  family: 4 as const,
};

async function* bodyChunks(
  ...chunks: string[]
): AsyncGenerator<Uint8Array> {
  for (const chunk of chunks) {
    yield Buffer.from(chunk, 'utf8');
  }
}

function response(
  status: number,
  body = '',
  headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
  },
): SourceTransportRawResponse {
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Test response',
    headers,
    body: bodyChunks(body),
  };
}

async function expectTransportError(
  task: () => Promise<unknown>,
  expectedCode: SourceTransportError['code'],
): Promise<void> {
  try {
    await task();
    assert.fail(`Expected ${expectedCode} transport error.`);
  } catch (error) {
    assert.ok(error instanceof SourceTransportError);
    assert.equal(error.code, expectedCode);
  }
}

function createTestTransport(
  request: (
    url: URL,
  ) => Promise<SourceTransportRawResponse>,
) {
  return createSourceTransport({
    resolveHostname: async (hostname) => {
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return [
          {
            address: '127.0.0.1',
            family: 4,
          },
        ];
      }

      if (hostname === 'mapped-private.example') {
        return [
          {
            address: '::ffff:127.0.0.1',
            family: 6,
          },
        ];
      }

      if (hostname === 'internal.example') {
        return [
          {
            address: '10.0.0.8',
            family: 4,
          },
        ];
      }

      return [publicAddress];
    },
    request: async (input) => request(input.url),
  });
}

async function run() {
  const validTransport = createTestTransport(
    async () => response(200, '<article>Safe source</article>'),
  );

  const valid = await validTransport.fetchSource(
    'https://source.example/report',
  );

  assert.equal(valid.ok, true);
  assert.equal(valid.finalUrl, 'https://source.example/report');
  assert.equal(valid.contentType, 'text/html; charset=utf-8');
  assert.equal(valid.body, '<article>Safe source</article>');
  assert.equal(valid.protected, false);

  await expectTransportError(
    () => validTransport.fetchSource('not a URL'),
    'INVALID_URL',
  );
  await expectTransportError(
    () => validTransport.fetchSource('http://source.example'),
    'UNSAFE_URL',
  );
  await expectTransportError(
    () => validTransport.fetchSource('https://127.0.0.1'),
    'UNSAFE_URL',
  );
  await expectTransportError(
    () => validTransport.fetchSource('https://localhost'),
    'UNSAFE_URL',
  );
  await expectTransportError(
    () =>
      validTransport.fetchSource(
        'https://mapped-private.example',
      ),
    'UNSAFE_URL',
  );

  const unsafeRedirectTransport = createTestTransport(
    async () =>
      response(302, '', {
        location: 'https://internal.example/private',
      }),
  );

  await expectTransportError(
    () =>
      unsafeRedirectTransport.fetchSource(
        'https://source.example/start',
      ),
    'UNSAFE_REDIRECT',
  );

  let redirects = 0;
  const redirectLimitTransport = createTestTransport(async () => {
    redirects += 1;

    return response(302, '', {
      location: `https://source.example/redirect-${redirects}`,
    });
  });

  await expectTransportError(
    () =>
      redirectLimitTransport.fetchSource(
        'https://source.example/start',
        { maxRedirects: 1 },
      ),
    'REDIRECT_LIMIT',
  );

  const oversizedTransport = createTestTransport(
    async () => response(200, 'this response is too large'),
  );

  await expectTransportError(
    () =>
      oversizedTransport.fetchSource(
        'https://source.example/large',
        { maxBodyBytes: 8 },
      ),
    'BODY_TOO_LARGE',
  );

  const protectedTransport = createTestTransport(
    async () => response(403, 'Access denied'),
  );
  const protectedResponse =
    await protectedTransport.fetchSource(
      'https://source.example/protected',
    );

  assert.equal(protectedResponse.ok, false);
  assert.equal(protectedResponse.protected, true);
  assert.equal(protectedResponse.protection, 'access_forbidden');
  assert.equal(protectedResponse.body, '');

  const challengeTransport = createTestTransport(
    async () =>
      response(
        200,
        '<title>Just a moment...</title>Checking your browser',
      ),
  );
  const challengeResponse =
    await challengeTransport.fetchSource(
      'https://source.example/challenge',
    );

  assert.equal(challengeResponse.ok, false);
  assert.equal(challengeResponse.protection, 'anti_bot_challenge');

  const timeoutTransport = createTestTransport(async () => {
    throw new SourceTransportError(
      'TIMEOUT',
      'Synthetic timeout.',
    );
  });

  await expectTransportError(
    () => timeoutTransport.fetchSource('https://source.example/slow'),
    'TIMEOUT',
  );

  console.log('✓ Source transport security smoke test passed.');
  console.log('  HTTPS validation, network safety, redirects, size limits, protection, and timeout handling covered.');
}

run().catch((error) => {
  console.error('✗ Source transport security smoke test failed.');
  console.error(error);
  process.exit(1);
});
