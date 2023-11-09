import clear from "rollup-plugin-clear";
import copy from "rollup-plugin-copy";
import typescript from "@rollup/plugin-typescript";

const outputDir = "dist";

export default {
  input: ["src/async-monitor.ts"],
  output: {
    dir: outputDir,
    format: "cjs",
  },
  plugins: [
    clear({ targets: [outputDir] }),
    typescript({ declarationDir: outputDir }),
    copy({
      targets: [
        { dest: outputDir, src: ["package.json", "LICENSE", "README.md"] },
      ],
    }),
  ],
};
