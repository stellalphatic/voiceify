import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "VoiceifyWidget",
      formats: ["es", "umd"],
      fileName: (format) => `voiceify-widget.${format}.js`,
    },
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
  },
});
