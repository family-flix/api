/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "cache-control",
            value: "max-age=10368000",
          },
        ],
      },
      {
        source: "/pc/:path*",
        headers: [
          {
            key: "cache-control",
            value: "max-age=10368000",
          },
        ],
      },
      {
        source: "/mobile/:path*",
        headers: [
          {
            key: "cache-control",
            value: "max-age=10368000",
          },
        ],
      },
    ];
  },
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
