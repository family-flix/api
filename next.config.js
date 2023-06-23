/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/admin/:path*",
        destination: "/admin/index.html",
      },
      {
        source: "/pc/:path*",
        destination: "/pc/index.html",
      },
      {
        source: "/mobile/:path*",
        destination: "/mobile/index.html",
      },
    ];
  },
};
