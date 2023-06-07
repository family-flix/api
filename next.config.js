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
        source: "/mobile/:path*",
        destination: "/mobile/index.html",
      },
    ];
  },
};

// const moduleUrl = import.meta.url;
// const moduleDir = new URL(".", moduleUrl).pathname;
// console.log(moduleDir);
// const path = moduleDir;

// export default {
//   // basePath: path,
//   reactStrictMode: false,

//   async rewrites() {
//     return [
//       {
//         source: "/admin/:path*",
//         destination: "/admin/index.html",
//       },
//       {
//         source: "/mobile/:path*",
//         destination: "/mobile/index.html",
//       },
//     ];
//   },
// };
