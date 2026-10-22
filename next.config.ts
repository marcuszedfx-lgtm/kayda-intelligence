/**
 * =========================================================
 * KAYDA INTELLIGENCE — NEXT CONFIGURATION
 * =========================================================
 *
 * `allowedDevOrigins` restricts which origins may pull
 * development assets (HMR client, dev scripts) from the dev
 * server. Kayda is bound to the loopback interface, so only
 * the local names are listed. This is Next.js 16's own
 * cross-site protection for development, in addition to the
 * Host and Origin validation performed in `src/proxy.ts`.
 */
const nextConfig = {
  // Do not advertise the framework on responses. It tells a
  // visitor nothing useful and gives an attacker a version hint.
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['localhost', '127.0.0.1', '::1'],
};

export default nextConfig;
