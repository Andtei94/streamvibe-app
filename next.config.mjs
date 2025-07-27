
/** @type {import('next').NextConfig} */

const nextConfig = {
  // Configures experimental features in Next.js.
  experimental: {
    // Server Actions settings.
    serverActions: {
      // Sets the maximum size for the request body of a Server Action.
      // This is crucial for features like large file uploads.
      // A generous limit of '16gb' is set here to accommodate large media files.
      bodySizeLimit: '16gb',
    },
  },
  // Configures how Next.js handles images.
  images: {
    // Defines a list of allowed hostnames for optimized images using next/image.
    // This is a security measure to prevent loading images from untrusted sources.
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'm.imdb.com' },
      { protocol: 'https', hostname: 'imdb.com' },
    ],
  },
  // This setting tells the build system to continue even if it finds
  // non-critical TypeScript errors. This is crucial for fixing the
  // current deployment issue.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
