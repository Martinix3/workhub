/**
 * Pre-Deploy Review Configuration
 *
 * SSOT for all review settings. Modify this file to adjust
 * thresholds, commands, and behavior for each phase.
 *
 * @see ./pre-deploy-review.types.ts for type definitions
 */

import type { PreDeployConfig } from './pre-deploy-review.types';

export const preDeployConfig: PreDeployConfig = {
  // ===================
  // FASE 0: Verificaciones Básicas
  // ===================
  basicChecks: {
    enabled: true,
    blocking: true,

    typecheck: {
      enabled: true,
      command: 'npx tsc --noEmit --pretty',
      ignorePatterns: [],
    },

    lint: {
      enabled: true,
      command: 'npm run lint',
      autoFix: false,
      warnOnly: [
        '@typescript-eslint/no-explicit-any',
      ],
    },

    build: {
      enabled: true,
      command: 'npm run build',
      bundleSizeLimit: {
        enabled: true,
        maxSizeKB: 500,
        warnSizeKB: 400,
      },
    },

    unitTests: {
      enabled: true,
      command: 'npm run test:unit',
      coverage: {
        enabled: true,
        minCoverage: 60,
        criticalFiles: [
          'src/api/services/*.ts',
          'src/auth/*.ts',
        ],
      },
    },
  },

  // ===================
  // FASE 1: Dead Code
  // ===================
  deadCode: {
    enabled: true,
    blocking: true,

    scanPaths: [
      'src/components',
      'src/pages',
      'src/api',
      'src/hooks',
    ],

    ignore: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/index.ts',
      'src/types/**',
    ],

    allowedUnusedExports: [
      'preDeployConfig',
      'designTokens',
      // Add exports that are used externally
    ],
  },

  // ===================
  // FASE 2: Tests E2E
  // ===================
  e2e: {
    enabled: true,
    blocking: true,

    ralphWiggum: {
      maxRetries: 5,
      testCommand: 'npm run test:e2e',
      failFast: false,
    },

    specs: [],
    skipSpecs: ['visual/**'],
  },

  // ===================
  // FASE 3: Visual Regression
  // ===================
  visualRegression: {
    enabled: true,
    blocking: false,

    testCommand: 'npm run test:visual',
    diffThreshold: 0.1,

    criticalComponents: [
      'buttons',
      'navigation',
      'forms',
    ],
  },

  // ===================
  // FASE 4: Lighthouse
  // ===================
  lighthouse: {
    enabled: true,
    blocking: false,

    testCommand: 'npm run test:lighthouse',

    thresholds: {
      performance: 70,
      accessibility: 80,
      bestPractices: 80,
      seo: 70,
    },

    pages: [
      '/',
      '/tasks',
      '/tasks/kanban',
      '/settings',
    ],
  },

  // ===================
  // FASE 5: Security
  // ===================
  security: {
    enabled: true,
    blocking: false,

    checks: {
      apiPermissions: {
        enabled: true,
        auditFile: 'docs/SECURITY-PERMISSIONS-AUDIT.md',
      },

      hardcodedValues: {
        enabled: true,
        patterns: [
          /#[0-9A-Fa-f]{6}/,
          /localhost:\d+/,
          /127\.0\.0\.1/,
        ],
        allowList: [
          'design-tokens.ts',
          'tailwind.config.ts',
        ],
      },

      inputSanitization: {
        enabled: true,
        checkComponents: ['forms', 'modals', 'inputs'],
      },
    },
  },

  // ===================
  // DESIGN SYSTEM VALIDATION
  // ===================
  designSystem: {
    enabled: true,
    ssotPath: 'src/styles/design-tokens.ts',
    referencePath: 'santa-brisa-design-system.html',

    allowedColors: {
      autoExtract: true,
      additional: ['transparent', 'inherit', 'currentColor', 'white', 'black'],
    },

    hardcodedColorPatterns: [
      /#[0-9A-Fa-f]{3,8}/,
      /rgb\([^)]+\)/,
      /rgba\([^)]+\)/,
      /hsl\([^)]+\)/,
    ],

    allowHardcodedIn: [
      '**/design-tokens.ts',
      '**/tailwind.config.*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.visual.spec.*',
    ],
  },

  // ===================
  // COMANDOS POR FASE
  // ===================
  commands: {
    phase0: {
      typecheck: 'npx tsc --noEmit --pretty',
      lint: 'npm run lint',
      build: 'npm run build',
      unitTests: 'npm run test -- --coverage --passWithNoTests',
    },

    phase1: {
      unusedExports: 'npx knip --reporter json',
      unusedImports: 'npx ts-prune --error',
      unusedVars: 'npx eslint --rule "no-unused-vars: error" src/ --format json',
    },

    phase2: {
      e2e: 'npm run test:e2e',
      e2eHeaded: 'npm run test:e2e -- --headed',
      ralphTarget: 'npm run test:e2e -- --reporter=json',
    },

    phase3: {
      visual: 'npm run test:visual',
      visualUpdate: 'npm run test:visual:update',
    },

    phase4: {
      lighthouse: 'npm run test:lighthouse',
      lighthouseUpdate: 'npm run test:lighthouse:update',
    },

    phase5: {
      hardcoded: 'grep -rn --include="*.ts" --include="*.tsx" "#[0-9A-Fa-f]\\{6\\}" src/',
      auditDeps: 'npm audit --json',
    },
  },

  // ===================
  // RALPH WIGGUM CONFIG
  // ===================
  ralphWiggum: {
    maxAttempts: 10,
    retryDelay: 2000,
    failFast: false,
    testCommand: 'npm run test:e2e',
    enabledPhases: ['phase2'],

    autoFix: {
      enabled: false,
      allowedFixes: ['snapshot-update', 'lint-fix'],
    },

    onComplete: {
      sound: true,
      notification: true,
    },
  },

  // ===================
  // FLUJO DE EJECUCIÓN
  // ===================
  executionFlow: {
    order: ['phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'phase5'],

    onPhaseFailure: {
      blocking: 'stop',
      nonBlocking: 'continue',
    },

    hooks: {
      beforeAll: 'npm install',
      afterAll: undefined,

      beforePhase: {
        // phase2: 'npm run dev &', // Uncomment if E2E needs dev server
      },
      afterPhase: {
        // phase2: 'pkill -f "vite"', // Uncomment to kill dev server
      },
    },

    parallel: {
      enabled: true,
      groups: [['phase3', 'phase4']],
    },
  },

  // ===================
  // HERRAMIENTAS REQUERIDAS
  // ===================
  requiredTools: {
    npm: { minVersion: '9.0.0' },
    node: { minVersion: '18.0.0' },

    devDeps: [
      'typescript',
      'eslint',
      'vitest',
      '@playwright/test',
      'knip',
    ],
  },

  // ===================
  // OUTPUT / REGISTRO
  // ===================
  output: {
    reportPath: 'docs/reports/pre-deploy-review-{date}.md',
    historyPath: 'docs/reports/history/',

    outputs: {
      markdown: 'docs/reports/pre-deploy-{date}.md',
      json: 'docs/reports/pre-deploy-{date}.json',
      html: 'docs/reports/pre-deploy-{date}.html',
    },

    notifications: {
      console: true,
      slack: false,
      slackWebhook: undefined,
    },
  },
};

// ===================
// PHASE NAMES (for display)
// ===================
export const phaseNames: Record<string, string> = {
  phase0: 'Basic Checks (TypeScript, Lint, Build, Unit Tests)',
  phase1: 'Dead Code Analysis',
  phase2: 'E2E Tests',
  phase3: 'Visual Regression',
  phase4: 'Lighthouse Performance',
  phase5: 'Security Audit',
};

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Check if a phase is blocking (stops execution on failure)
 */
export function isBlockingPhase(phase: string): boolean {
  switch (phase) {
    case 'phase0':
      return preDeployConfig.basicChecks.blocking;
    case 'phase1':
      return preDeployConfig.deadCode.blocking;
    case 'phase2':
      return preDeployConfig.e2e.blocking;
    case 'phase3':
      return preDeployConfig.visualRegression.blocking;
    case 'phase4':
      return preDeployConfig.lighthouse.blocking;
    case 'phase5':
      return preDeployConfig.security.blocking;
    default:
      return false;
  }
}

/**
 * Check if a phase is enabled
 */
export function isPhaseEnabled(phase: string): boolean {
  switch (phase) {
    case 'phase0':
      return preDeployConfig.basicChecks.enabled;
    case 'phase1':
      return preDeployConfig.deadCode.enabled;
    case 'phase2':
      return preDeployConfig.e2e.enabled;
    case 'phase3':
      return preDeployConfig.visualRegression.enabled;
    case 'phase4':
      return preDeployConfig.lighthouse.enabled;
    case 'phase5':
      return preDeployConfig.security.enabled;
    default:
      return false;
  }
}

/**
 * Get commands for a specific phase
 */
export function getPhaseCommands(phase: string): Record<string, string> {
  return preDeployConfig.commands[phase as keyof typeof preDeployConfig.commands] || {};
}

/**
 * Replace date placeholder in path
 */
export function resolvePath(pathTemplate: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  return pathTemplate
    .replace('{date}', `${dateStr}-${timeStr}`)
    .replace('{dateOnly}', dateStr);
}

export default preDeployConfig;
