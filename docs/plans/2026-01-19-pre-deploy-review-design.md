# Pre-Deploy Review Plan - WorkHub

**Fecha:** 2026-01-19
**Estado:** Aprobado
**Autor:** Claude + Usuario

---

## Resumen

Plan de review pre-deploy por fases con configuración centralizada, sin valores hardcodeados, y registro persistente para ajustes desde settings.

## Estructura de Fases

```
┌─────────────────────────────────────────────────────────────┐
│                 REVIEW PRE-DEPLOY COMPLETA                  │
├─────────────────────────────────────────────────────────────┤
│  FASE 0: Verificaciones Básicas      [BLOQUEANTE]           │
│  ├── 0.1 TypeScript typecheck (tsc --noEmit)                │
│  ├── 0.2 ESLint                                             │
│  ├── 0.3 Build production                                   │
│  ├── 0.4 Unit tests                                         │
│  └── Criterio: 0 errores                                    │
├─────────────────────────────────────────────────────────────┤
│  FASE 1: Dead Code Analysis          [BLOQUEANTE]           │
│  ├── 1.1 Imports huérfanos                                  │
│  ├── 1.2 Exports sin consumidores                           │
│  ├── 1.3 Variables/funciones no usadas                      │
│  └── Criterio: 0 dead code                                  │
├─────────────────────────────────────────────────────────────┤
│  FASE 2: Tests E2E                   [BLOQUEANTE]           │
│  ├── 2.1 E2E tests (playwright)                             │
│  ├── 2.2 Ralph Wiggum loop hasta green                      │
│  └── Criterio: 100% tests passing                           │
├─────────────────────────────────────────────────────────────┤
│  FASE 3: Visual Regression           [DOCUMENTAR]           │
│  ├── 3.1 Visual tests snapshots                             │
│  ├── 3.2 Revisar diffs                                      │
│  └── Criterio: Documentar cambios intencionales             │
├─────────────────────────────────────────────────────────────┤
│  FASE 4: Lighthouse Performance      [DOCUMENTAR]           │
│  ├── 4.1 Performance audit                                  │
│  ├── 4.2 Accessibility audit                                │
│  ├── 4.3 Best practices / SEO                               │
│  └── Criterio: Scores > thresholds configurados             │
├─────────────────────────────────────────────────────────────┤
│  FASE 5: Security & Hardcoded        [DOCUMENTAR]           │
│  ├── 5.1 Buscar valores hardcodeados                        │
│  ├── 5.2 Verificar uso de design tokens                     │
│  ├── 5.3 API permissions audit                              │
│  ├── 5.4 Input sanitization                                 │
│  └── Criterio: 0 críticos, documentar warnings              │
└─────────────────────────────────────────────────────────────┘
```

## Criterios de Bloqueo

| Fase | Tipo | Comportamiento |
|------|------|----------------|
| F0 - Basic Checks | BLOQUEANTE | Si falla, no avanza |
| F1 - Dead Code | BLOQUEANTE | Si falla, no avanza |
| F2 - Tests E2E | BLOQUEANTE | Ralph Wiggum loop hasta green |
| F3 - Visual | DOCUMENTAR | Registra issues, continúa |
| F4 - Lighthouse | DOCUMENTAR | Registra issues, continúa |
| F5 - Security | DOCUMENTAR | Críticos bloquean, warnings documentan |

---

## Archivos a Crear

### 1. Configuración Central

**Archivo:** `config/pre-deploy-review.config.ts`

```typescript
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
      command: 'npx tsc --noEmit',
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
      'web/src/components',
      'web/src/pages',
      'web/src/api',
      'web/src/hooks',
    ],

    ignore: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/index.ts',
      'web/src/types/**',
    ],

    allowedUnusedExports: [
      'preDeployConfig',
      'designTokens',
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
    ssotPath: 'web/src/styles/design-tokens.ts',
    referencePath: 'santa-brisa-design-system.html',

    allowedColors: {
      autoExtract: true,
      additional: ['transparent', 'inherit', 'currentColor'],
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
    ],
  },

  // ===================
  // COMANDOS POR FASE
  // ===================
  commands: {
    phase0: {
      typecheck: 'cd web && npx tsc --noEmit --pretty',
      lint: 'cd web && npm run lint',
      build: 'cd web && npm run build',
      unitTests: 'cd web && npm run test:unit -- --coverage',
    },

    phase1: {
      unusedExports: 'cd web && npx knip --reporter json',
      unusedImports: 'cd web && npx ts-prune --error',
      unusedVars: 'cd web && npx eslint --rule "no-unused-vars: error" src/',
    },

    phase2: {
      e2e: 'cd web && npm run test:e2e',
      e2eHeaded: 'cd web && npm run test:e2e -- --headed',
      ralphTarget: 'cd web && npm run test:e2e -- --reporter=json',
    },

    phase3: {
      visual: 'cd web && npm run test:visual',
      visualUpdate: 'cd web && npm run test:visual:update',
    },

    phase4: {
      lighthouse: 'cd web && npm run test:lighthouse',
      lighthouseUpdate: 'cd web && npm run test:lighthouse:update',
    },

    phase5: {
      hardcoded: 'grep -rn --include="*.ts" --include="*.tsx" "#[0-9A-Fa-f]\\{6\\}" web/src/',
      auditDeps: 'cd web && npm audit --json',
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
      afterAll: 'npm run report:generate',

      beforePhase: {
        phase2: 'npm run dev &',
      },
      afterPhase: {
        phase2: 'pkill -f "vite"',
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
      'ts-prune',
      'lighthouse',
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
    },
  },
};
```

### 2. Tipos TypeScript

**Archivo:** `config/pre-deploy-review.types.ts`

```typescript
export interface PreDeployConfig {
  basicChecks: BasicChecksConfig;
  deadCode: DeadCodeConfig;
  e2e: E2EConfig;
  visualRegression: VisualRegressionConfig;
  lighthouse: LighthouseConfig;
  security: SecurityConfig;
  designSystem: DesignSystemConfig;
  commands: CommandsConfig;
  ralphWiggum: RalphWiggumConfig;
  executionFlow: ExecutionFlowConfig;
  requiredTools: RequiredToolsConfig;
  output: OutputConfig;
}

export interface BasicChecksConfig {
  enabled: boolean;
  blocking: boolean;
  typecheck: {
    enabled: boolean;
    command: string;
    ignorePatterns: string[];
  };
  lint: {
    enabled: boolean;
    command: string;
    autoFix: boolean;
    warnOnly: string[];
  };
  build: {
    enabled: boolean;
    command: string;
    bundleSizeLimit: {
      enabled: boolean;
      maxSizeKB: number;
      warnSizeKB: number;
    };
  };
  unitTests: {
    enabled: boolean;
    command: string;
    coverage: {
      enabled: boolean;
      minCoverage: number;
      criticalFiles: string[];
    };
  };
}

export interface DeadCodeConfig {
  enabled: boolean;
  blocking: boolean;
  scanPaths: string[];
  ignore: string[];
  allowedUnusedExports: string[];
}

export interface E2EConfig {
  enabled: boolean;
  blocking: boolean;
  ralphWiggum: {
    maxRetries: number;
    testCommand: string;
    failFast: boolean;
  };
  specs: string[];
  skipSpecs: string[];
}

export interface VisualRegressionConfig {
  enabled: boolean;
  blocking: boolean;
  testCommand: string;
  diffThreshold: number;
  criticalComponents: string[];
}

export interface LighthouseConfig {
  enabled: boolean;
  blocking: boolean;
  testCommand: string;
  thresholds: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  pages: string[];
}

export interface SecurityConfig {
  enabled: boolean;
  blocking: boolean;
  checks: {
    apiPermissions: {
      enabled: boolean;
      auditFile: string;
    };
    hardcodedValues: {
      enabled: boolean;
      patterns: RegExp[];
      allowList: string[];
    };
    inputSanitization: {
      enabled: boolean;
      checkComponents: string[];
    };
  };
}

export interface DesignSystemConfig {
  enabled: boolean;
  ssotPath: string;
  referencePath: string;
  allowedColors: {
    autoExtract: boolean;
    additional: string[];
  };
  hardcodedColorPatterns: RegExp[];
  allowHardcodedIn: string[];
}

export interface CommandsConfig {
  phase0: Record<string, string>;
  phase1: Record<string, string>;
  phase2: Record<string, string>;
  phase3: Record<string, string>;
  phase4: Record<string, string>;
  phase5: Record<string, string>;
}

export interface RalphWiggumConfig {
  maxAttempts: number;
  retryDelay: number;
  failFast: boolean;
  testCommand: string;
  enabledPhases: string[];
  autoFix: {
    enabled: boolean;
    allowedFixes: string[];
  };
  onComplete: {
    sound: boolean;
    notification: boolean;
  };
}

export interface ExecutionFlowConfig {
  order: string[];
  onPhaseFailure: {
    blocking: 'stop' | 'continue';
    nonBlocking: 'stop' | 'continue';
  };
  hooks: {
    beforeAll?: string;
    afterAll?: string;
    beforePhase?: Record<string, string>;
    afterPhase?: Record<string, string>;
  };
  parallel: {
    enabled: boolean;
    groups: string[][];
  };
}

export interface RequiredToolsConfig {
  npm: { minVersion: string };
  node: { minVersion: string };
  devDeps: string[];
}

export interface OutputConfig {
  reportPath: string;
  historyPath: string;
  outputs: {
    markdown: string;
    json: string;
    html: string;
  };
  notifications: {
    console: boolean;
    slack: boolean;
  };
}

// Resultado de cada fase
export interface PhaseResult {
  phase: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  duration: number;
  issues: Issue[];
  summary: Record<string, unknown>;
}

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  rule?: string;
}

export interface ReviewReport {
  date: string;
  commitHash: string;
  branch: string;
  phases: PhaseResult[];
  finalStatus: 'passed' | 'failed';
  actionItems: ActionItem[];
}

export interface ActionItem {
  description: string;
  priority: 'high' | 'medium' | 'low';
  phase: string;
}
```

---

## Implementación

### Scripts npm a agregar en `web/package.json`

```json
{
  "scripts": {
    "review:pre-deploy": "ts-node scripts/pre-deploy-review.ts",
    "review:phase0": "ts-node scripts/pre-deploy-review.ts --phase=0",
    "review:phase1": "ts-node scripts/pre-deploy-review.ts --phase=1",
    "review:phase2": "ts-node scripts/pre-deploy-review.ts --phase=2",
    "review:phase3": "ts-node scripts/pre-deploy-review.ts --phase=3",
    "review:phase4": "ts-node scripts/pre-deploy-review.ts --phase=4",
    "review:phase5": "ts-node scripts/pre-deploy-review.ts --phase=5",
    "review:report": "ts-node scripts/generate-report.ts"
  }
}
```

### Dependencias a instalar

```bash
npm install -D knip ts-prune
```

---

## Uso

### Ejecutar review completa
```bash
npm run review:pre-deploy
```

### Ejecutar fase específica
```bash
npm run review:phase1  # Solo dead code
```

### Con Ralph Wiggum (loop hasta green)
```bash
/ralph-loop npm run review:pre-deploy
```

### Ver reporte
```bash
cat docs/reports/pre-deploy-{fecha}.md
```

---

## Próximos Pasos

1. [ ] Crear `config/pre-deploy-review.config.ts`
2. [ ] Crear `config/pre-deploy-review.types.ts`
3. [ ] Crear script runner `scripts/pre-deploy-review.ts`
4. [ ] Instalar dependencias (`knip`, `ts-prune`)
5. [ ] Agregar scripts a `package.json`
6. [ ] Ejecutar primera review

---

*Plan generado: 2026-01-19*
