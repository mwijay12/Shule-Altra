import type {NextConfig} from 'next';
import path from 'path';

/**
 * DEMO MODE
 * ---------
 * When NEXT_PUBLIC_DEMO_MODE is not explicitly "false", the Firebase SDK is
 * swapped for the offline demo layer in src/lib/demo. This lets the full hub
 * run with realistic seeded Tanzanian school data and zero cloud setup.
 *
 * Set NEXT_PUBLIC_DEMO_MODE=false (plus real Firebase credentials) to run
 * against a live Google Cloud / Firebase project.
 */
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

const demoModules = [
  'app',
  'auth',
  'firestore',
  'storage',
] as const;

const turbopackAliases = Object.fromEntries(
  demoModules.map((moduleName) => [`firebase/${moduleName}`, `./src/lib/demo/firebase-${moduleName}.ts`])
);

const webpackAliases = Object.fromEntries(
  demoModules.map((moduleName) => [
    `firebase/${moduleName}`,
    path.resolve(__dirname, `src/lib/demo/firebase-${moduleName}.ts`),
  ])
);

const nextConfig: NextConfig = {
  // Allows the hosted preview proxy (and localhost) to load the dev server
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', 'localhost', '127.0.0.1'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  ...(demoMode
    ? {
        turbopack: {
          resolveAlias: turbopackAliases,
        },
        webpack: (config) => {
          config.resolve = config.resolve || {};
          config.resolve.alias = {
            ...(config.resolve.alias || {}),
            ...webpackAliases,
          };
          return config;
        },
      }
    : {}),
};

export default nextConfig;
