import type { Metadata } from 'next';

import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Sign in — Kayda Intelligence',
  description: 'Operator sign in for the Kayda Intelligence workspace.',
};

/**
 * =========================================================
 * OPERATOR SIGN IN
 * =========================================================
 *
 * The only page reachable without a session. The operator
 * types the token once; the server compares it in constant
 * time and issues an HTTP-only session cookie.
 *
 * The token is never returned by the server, never written
 * to localStorage or sessionStorage, and never placed in a
 * cookie. It exists only in the password field, for as long
 * as the field holds it.
 */
export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="eyebrow">KAYDA INTELLIGENCE</span>
          <h1>Operator sign in</h1>
          <p>
            Enter the operator token to unlock this workspace. The token is
            checked on the server, in constant time, and is never stored in
            the browser.
          </p>
        </div>

        <LoginForm />

        <p className="login-footnote">
          The token is the value of <code>KAYDA_OPERATOR_TOKEN</code> in the
          server environment. See <code>docs/SECURITY.md</code> for how to
          generate and rotate it.
        </p>
      </section>
    </main>
  );
}
