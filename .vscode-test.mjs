import { defineConfig } from '@vscode/test-cli';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
    {
        files: 'out/test/suites/multi-root-workspace/**/*.js',
        version: 'stable',
        extensionDevelopmentPath: __dirname,
        workspaceFolder: `${__dirname}/test/fixtures/multi-root-workspace/multi-root-workspace.code-workspace`,
        mocha: {
            timeout: 60000,
        },
    },
]);