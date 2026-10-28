// Barrel so the docs app imports uele through one place. The relative path
// resolves natively in Node (test scripts) and through Vite (which serves
// files outside the site root via server.fs.allow), while the automatic JSX
// runtime used by .jsx files is mapped to the same source by vite.config.js.
export * from "../../../src/index.js";
