'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * =========================================================
 * OPERATOR SIGN IN FORM
 * =========================================================
 *
 * The token is deliberately kept OUT of React state and out
 * of every browser storage API. The field is uncontrolled:
 * the value is read from the DOM only at the moment of
 * submission, sent once to the server, and the field is
 * cleared immediately afterwards.
 *
 * Nothing about the token is ever written to localStorage,
 * sessionStorage, a cookie, the URL, or the console.
 */
export default function LoginForm() {
  const router = useRouter();
  const fieldRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const field = fieldRef.current;
    const token = field?.value ?? '';

    if (!token.trim()) {
      setError('Enter the operator token.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(
          typeof payload?.error === 'string'
            ? payload.error
            : 'The sign-in attempt was refused.',
        );

        if (field) {
          field.value = '';
        }

        return;
      }

      if (field) {
        field.value = '';
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('The server could not be reached. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="operator-token">Operator token</label>

      <input
        id="operator-token"
        name="operator-token"
        ref={fieldRef}
        type="password"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
        placeholder="Paste the operator token"
      />

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="login-submit" disabled={busy}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
