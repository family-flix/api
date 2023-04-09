import path from "path";

const config = {
  resolve: {
    alias: {
      "@list-helper/core": path.resolve(
        __dirname,
        "./domains/list-helper-core"
      ),
      "@list-helper/hooks": path.resolve(
        __dirname,
        "./domains/list-helper-hook"
      ),
      "@": path.resolve(__dirname, "."),
    },
  },
};

export default config;
