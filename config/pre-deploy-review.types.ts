/**
 * Pre-Deploy Review Configuration Types
 * SSOT for all review phases and settings
 */

// ===================
// PHASE CONFIGS
// ===================

export interface TypecheckConfig {
  enabled: boolean;
  command: string;
  ignorePatterns: string[];
}

export interface LintConfig {
  enabled: boolean;
  command: string;
  autoFix: boolean;
  warnOnly: string[];
}

export interface BuildConfig {
  enabled: boolean;
  command: string;
  bundleSizeLimit: {
    enabled: boolean;
    maxSizeKB: number;
    warnSizeKB: number;
  };
}

export interface UnitTestsConfig {
  enabled: boolean;
  command: string;
  coverage: {
    enabled: boolean;
    minCoverage: number;
    criticalFiles: string[];
  };
}

export interface BasicChecksConfig {
  enabled: boolean;
  blocking: boolean;
  typecheck: TypecheckConfig;
  lint: LintConfig;
  build: BuildConfig;
  unitTests: UnitTestsConfig;
}

export interface DeadCodeConfig {
  enabled: boolean;
  blocking: boolean;
  scanPaths: string[];
  ignore: string[];
  allowedUnusedExports: string[];
}

export interface RalphWiggumE2EConfig {
  maxRetries: number;
  testCommand: string;
  failFast: boolean;
}

export interface E2EConfig {
  enabled: boolean;
  blocking: boolean;
  ralphWiggum: RalphWiggumE2EConfig;
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

export interface LighthouseThresholds {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseConfig {
  enabled: boolean;
  blocking: boolean;
  testCommand: string;
  thresholds: LighthouseThresholds;
  pages: string[];
}

export interface ApiPermissionsCheck {
  enabled: boolean;
  auditFile: string;
}

export interface HardcodedValuesCheck {
  enabled: boolean;
  patterns: RegExp[];
  allowList: string[];
}

export interface InputSanitizationCheck {
  enabled: boolean;
  checkComponents: string[];
}

export interface SecurityChecks {
  apiPermissions: ApiPermissionsCheck;
  hardcodedValues: HardcodedValuesCheck;
  inputSanitization: InputSanitizationCheck;
}

export interface SecurityConfig {
  enabled: boolean;
  blocking: boolean;
  checks: SecurityChecks;
}

// ===================
// DESIGN SYSTEM
// ===================

export interface AllowedColors {
  autoExtract: boolean;
  additional: string[];
}

export interface DesignSystemConfig {
  enabled: boolean;
  ssotPath: string;
  referencePath: string;
  allowedColors: AllowedColors;
  hardcodedColorPatterns: RegExp[];
  allowHardcodedIn: string[];
}

// ===================
// COMMANDS
// ===================

export interface PhaseCommands {
  [key: string]: string;
}

export interface CommandsConfig {
  phase0: PhaseCommands;
  phase1: PhaseCommands;
  phase2: PhaseCommands;
  phase3: PhaseCommands;
  phase4: PhaseCommands;
  phase5: PhaseCommands;
}

// ===================
// RALPH WIGGUM
// ===================

export interface AutoFixConfig {
  enabled: boolean;
  allowedFixes: string[];
}

export interface OnCompleteConfig {
  sound: boolean;
  notification: boolean;
}

export interface RalphWiggumConfig {
  maxAttempts: number;
  retryDelay: number;
  failFast: boolean;
  testCommand: string;
  enabledPhases: string[];
  autoFix: AutoFixConfig;
  onComplete: OnCompleteConfig;
}

// ===================
// EXECUTION FLOW
// ===================

export interface PhaseFailureBehavior {
  blocking: 'stop' | 'continue';
  nonBlocking: 'stop' | 'continue';
}

export interface ExecutionHooks {
  beforeAll?: string;
  afterAll?: string;
  beforePhase?: Record<string, string>;
  afterPhase?: Record<string, string>;
}

export interface ParallelConfig {
  enabled: boolean;
  groups: string[][];
}

export interface ExecutionFlowConfig {
  order: string[];
  onPhaseFailure: PhaseFailureBehavior;
  hooks: ExecutionHooks;
  parallel: ParallelConfig;
}

// ===================
// TOOLS & OUTPUT
// ===================

export interface ToolVersion {
  minVersion: string;
}

export interface RequiredToolsConfig {
  npm: ToolVersion;
  node: ToolVersion;
  devDeps: string[];
}

export interface OutputFormats {
  markdown: string;
  json: string;
  html: string;
}

export interface NotificationsConfig {
  console: boolean;
  slack: boolean;
  slackWebhook?: string;
}

export interface OutputConfig {
  reportPath: string;
  historyPath: string;
  outputs: OutputFormats;
  notifications: NotificationsConfig;
}

// ===================
// MAIN CONFIG
// ===================

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

// ===================
// RESULTS & REPORTING
// ===================

export type IssueSeverity = 'error' | 'warning' | 'info';
export type PhaseStatus = 'passed' | 'failed' | 'skipped' | 'warning' | 'running' | 'pending';
export type FinalStatus = 'passed' | 'failed';
export type Priority = 'high' | 'medium' | 'low';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export interface PhaseResult {
  phase: string;
  phaseName: string;
  status: PhaseStatus;
  blocking: boolean;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  issues: Issue[];
  summary: Record<string, unknown>;
  command?: string;
  output?: string;
}

export interface ActionItem {
  description: string;
  priority: Priority;
  phase: string;
  file?: string;
  autoFixable: boolean;
}

export interface ReviewReport {
  id: string;
  date: string;
  commitHash: string;
  branch: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  phases: PhaseResult[];
  finalStatus: FinalStatus;
  actionItems: ActionItem[];
  config: PreDeployConfig;
}

// ===================
// RUNTIME TYPES
// ===================

export interface PhaseRunner {
  name: string;
  run: (config: PreDeployConfig) => Promise<PhaseResult>;
}

export interface ReviewContext {
  config: PreDeployConfig;
  report: ReviewReport;
  currentPhase?: string;
  aborted: boolean;
}

export type PhaseCallback = (result: PhaseResult) => void;

export interface ReviewOptions {
  phases?: string[];
  verbose?: boolean;
  dryRun?: boolean;
  onPhaseComplete?: PhaseCallback;
  onPhaseStart?: PhaseCallback;
}
