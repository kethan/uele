import base from './vitest.config.js';
export default {
    ...base,
    test: {
        ...base.test,
        name: 'core-production',
        coverage: {
            ...base.test.coverage,
            include: ['core/**/*.js', 'src/**/*.js', 'utils/**/*.js', 'flow/control.js'],
            exclude: ['core/dist/**'],
            thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 }
        }
    }
};
