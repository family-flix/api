import path from "path";

const config = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

export default config;
