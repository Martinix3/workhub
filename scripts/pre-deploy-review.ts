#!/usr/bin/env npx ts-node
/**
 * Pre-Deploy Review Script
 *
 * Executes all review phases according to configuration.
 * Run with: npx ts-node scripts/pre-deploy-review.ts
 *
 * Options:
 *   --phase=N    Run only phase N (0-5)
 *   --verbose    Show detailed output
 *   --dry-run    Show what would be executed without running
 *   --ralph      Enable Ralph Wiggum loop for failing phases
 *
 * Security Note: This script uses execSync with commands from config files only,
 * not user input. It's a local development tool, not production code.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {
  preDeployConfig,
  phaseNames,
  isBlockingPhase,
  isPhaseEnabled,
  getPhaseCommands,
} from '../config/pre-deploy-review.config';

import type {
  PhaseResult,
  ReviewReport,
  Issue,
  ActionItem,
  PhaseStatus,
} from '../config/pre-deploy-review.types';

// ===================
// CONSTANTS
// ===================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const ICONS = {
  passed: '✅',
  failed: '❌',
  warning: '⚠️',
  skipped: '⏭️',
  running: '🔄',
  pending: '⏳',
  info: 'ℹ️',
};

// ===================
// UTILITIES
// ===================

function log(message: string, color: string = COLORS.reset): void {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logPhase(phase: string, status: PhaseStatus, message?: string): void {
  const icon = ICONS[status];
  const name = phaseNames[phase] || phase;
  const blocking = isBlockingPhase(phase) ? '[BLOCKING]' : '[DOCUMENTING]';
  const statusColor = status === 'passed' ? COLORS.green :
                      status === 'failed' ? COLORS.red :
                      status === 'warning' ? COLORS.yellow : COLORS.cyan;

  log(`\n${icon} ${COLORS.bright}${name}${COLORS.reset} ${COLORS.dim}${blocking}${COLORS.reset}`);
  if (message) {
    log(`   ${statusColor}${message}${COLORS.reset}`);
  }
}

function logCommand(command: string): void {
  log(`   ${COLORS.dim}$ ${command}${COLORS.reset}`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function getGitInfo(): { branch: string; commitHash: string } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return { branch, commitHash };
  } catch {
    return { branch: 'unknown', commitHash: 'unknown' };
  }
}

/**
 * Run a command from configuration.
 * Commands are from config files only, not user input.
 */
function runCommand(command: string, options: { cwd?: string; silent?: boolean } = {}): {
  success: boolean;
  output: string;
  exitCode: number;
} {
  const cwd = options.cwd || path.join(__dirname, '../web');

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    return { success: true, output: output || '', exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    const output = (execError.stdout || '') + (execError.stderr || '');
    return { success: false, output, exitCode: execError.status || 1 };
  }
}

// ===================
// PHASE RUNNERS
// ===================

async function runPhase0(): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase0');
  const summary: Record<string, unknown> = {};

  // TypeScript
  if (preDeployConfig.basicChecks.typecheck.enabled) {
    log('\n   📘 TypeScript typecheck...', COLORS.cyan);
    logCommand(commands.typecheck);
    const result = runCommand(commands.typecheck, { silent: true });
    summary.typecheck = result.success ? 'passed' : 'failed';
    if (!result.success) {
      status = 'failed';
      issues.push({
        severity: 'error',
        message: 'TypeScript compilation failed',
        suggestion: 'Run `npx tsc --noEmit` to see errors',
      });
    }
  }

  // ESLint
  if (preDeployConfig.basicChecks.lint.enabled) {
    log('\n   📝 ESLint...', COLORS.cyan);
    logCommand(commands.lint);
    const result = runCommand(commands.lint, { silent: true });
    summary.lint = result.success ? 'passed' : 'failed';
    if (!result.success) {
      status = 'failed';
      issues.push({
        severity: 'error',
        message: 'ESLint found errors',
        suggestion: 'Run `npm run lint` to see errors',
      });
    }
  }

  // Build
  if (preDeployConfig.basicChecks.build.enabled) {
    log('\n   🏗️  Build...', COLORS.cyan);
    logCommand(commands.build);
    const result = runCommand(commands.build, { silent: true });
    summary.build = result.success ? 'passed' : 'failed';
    if (!result.success) {
      status = 'failed';
      issues.push({
        severity: 'error',
        message: 'Build failed',
        suggestion: 'Run `npm run build` to see errors',
      });
    }
  }

  // Unit tests
  if (preDeployConfig.basicChecks.unitTests.enabled) {
    log('\n   🧪 Unit tests...', COLORS.cyan);
    logCommand(commands.unitTests);
    const result = runCommand(commands.unitTests, { silent: true });
    summary.unitTests = result.success ? 'passed' : 'failed';
    if (!result.success) {
      status = 'failed';
      issues.push({
        severity: 'error',
        message: 'Unit tests failed',
        suggestion: 'Run `npm run test` to see failures',
      });
    }
  }

  const endTime = new Date();
  return {
    phase: 'phase0',
    phaseName: phaseNames.phase0,
    status,
    blocking: preDeployConfig.basicChecks.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
  };
}

async function runPhase1(): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase1');
  const summary: Record<string, unknown> = {};

  // Knip for unused exports
  log('\n   🔍 Checking unused exports (knip)...', COLORS.cyan);
  logCommand(commands.unusedExports);
  const knipResult = runCommand(commands.unusedExports, { silent: true });

  if (!knipResult.success) {
    // Knip returns non-zero if it finds issues
    try {
      const knipOutput = JSON.parse(knipResult.output);
      const unusedCount = Object.keys(knipOutput.files || {}).length +
                         Object.keys(knipOutput.dependencies || {}).length;
      summary.unusedExports = unusedCount;

      if (unusedCount > 0) {
        status = 'failed';
        issues.push({
          severity: 'error',
          message: `Found ${unusedCount} unused exports/dependencies`,
          suggestion: 'Run `npx knip` for details',
        });
      }
    } catch {
      // If output isn't JSON, just mark as failed
      summary.unusedExports = 'error parsing output';
    }
  } else {
    summary.unusedExports = 0;
  }

  const endTime = new Date();
  return {
    phase: 'phase1',
    phaseName: phaseNames.phase1,
    status,
    blocking: preDeployConfig.deadCode.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
  };
}

async function runPhase2(useRalph: boolean = false): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase2');
  const summary: Record<string, unknown> = {};

  log('\n   🎭 E2E Tests (Playwright)...', COLORS.cyan);
  logCommand(commands.e2e);

  let attempts = 0;
  const maxAttempts = useRalph ? preDeployConfig.ralphWiggum.maxAttempts : 1;
  let lastResult = { success: false, output: '', exitCode: 1 };

  while (attempts < maxAttempts) {
    attempts++;
    if (useRalph && attempts > 1) {
      log(`   🔄 Ralph Wiggum retry ${attempts}/${maxAttempts}...`, COLORS.yellow);
    }

    lastResult = runCommand(commands.e2e, { silent: true });

    if (lastResult.success) {
      break;
    }

    if (useRalph && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, preDeployConfig.ralphWiggum.retryDelay));
    }
  }

  summary.attempts = attempts;
  summary.passed = lastResult.success;

  if (!lastResult.success) {
    status = 'failed';
    issues.push({
      severity: 'error',
      message: `E2E tests failed after ${attempts} attempt(s)`,
      suggestion: 'Run `npm run test:e2e -- --headed` for debugging',
    });
  }

  const endTime = new Date();
  return {
    phase: 'phase2',
    phaseName: phaseNames.phase2,
    status,
    blocking: preDeployConfig.e2e.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
    output: lastResult.output,
  };
}

async function runPhase3(): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase3');
  const summary: Record<string, unknown> = {};

  log('\n   📸 Visual Regression Tests...', COLORS.cyan);
  logCommand(commands.visual);

  const result = runCommand(commands.visual, { silent: true });
  summary.passed = result.success;

  if (!result.success) {
    status = 'warning';
    issues.push({
      severity: 'warning',
      message: 'Visual differences detected',
      suggestion: 'Review snapshots and run `npm run test:visual:update` if intentional',
    });
  }

  const endTime = new Date();
  return {
    phase: 'phase3',
    phaseName: phaseNames.phase3,
    status,
    blocking: preDeployConfig.visualRegression.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
  };
}

async function runPhase4(): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase4');
  const summary: Record<string, unknown> = {};

  log('\n   ⚡ Lighthouse Performance Audit...', COLORS.cyan);
  logCommand(commands.lighthouse);

  const result = runCommand(commands.lighthouse, { silent: true });
  summary.passed = result.success;

  if (!result.success) {
    status = 'warning';
    issues.push({
      severity: 'warning',
      message: 'Lighthouse scores below threshold',
      suggestion: 'Review lighthouse report for optimization opportunities',
    });
  }

  const endTime = new Date();
  return {
    phase: 'phase4',
    phaseName: phaseNames.phase4,
    status,
    blocking: preDeployConfig.lighthouse.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
  };
}

async function runPhase5(): Promise<PhaseResult> {
  const startTime = new Date();
  const issues: Issue[] = [];
  let status: PhaseStatus = 'passed';
  const commands = getPhaseCommands('phase5');
  const summary: Record<string, unknown> = {};

  // Check for hardcoded values
  log('\n   🔒 Security: Checking hardcoded values...', COLORS.cyan);
  logCommand(commands.hardcoded);

  const hardcodedResult = runCommand(commands.hardcoded, { silent: true });

  // grep returns exit code 1 if no matches found (good), 0 if matches found (bad)
  if (hardcodedResult.exitCode === 0 && hardcodedResult.output) {
    const lines = hardcodedResult.output.split('\n').filter(Boolean);
    // Filter out allowed files
    const violations = lines.filter(line => {
      return !preDeployConfig.security.checks.hardcodedValues.allowList.some(
        allowed => line.includes(allowed)
      );
    });

    summary.hardcodedValues = violations.length;

    if (violations.length > 0) {
      status = 'warning';
      issues.push({
        severity: 'warning',
        message: `Found ${violations.length} potentially hardcoded color values`,
        suggestion: 'Use design tokens from src/styles/design-tokens.ts instead',
      });
    }
  } else {
    summary.hardcodedValues = 0;
  }

  // npm audit
  log('\n   🔒 Security: Dependency audit...', COLORS.cyan);
  logCommand(commands.auditDeps);

  const auditResult = runCommand(commands.auditDeps, { silent: true });
  try {
    const auditData = JSON.parse(auditResult.output);
    const vulnerabilities = auditData.metadata?.vulnerabilities || {};
    summary.audit = vulnerabilities;

    if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
      status = 'warning';
      issues.push({
        severity: vulnerabilities.critical > 0 ? 'error' : 'warning',
        message: `Found ${vulnerabilities.critical || 0} critical and ${vulnerabilities.high || 0} high vulnerabilities`,
        suggestion: 'Run `npm audit fix` or review dependencies',
      });
    }
  } catch {
    summary.audit = 'error parsing output';
  }

  const endTime = new Date();
  return {
    phase: 'phase5',
    phaseName: phaseNames.phase5,
    status,
    blocking: preDeployConfig.security.blocking,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    issues,
    summary,
  };
}

// ===================
// REPORT GENERATOR
// ===================

function generateReport(phases: PhaseResult[], gitInfo: { branch: string; commitHash: string }): ReviewReport {
  const actionItems: ActionItem[] = [];

  phases.forEach(phase => {
    phase.issues.forEach(issue => {
      actionItems.push({
        description: issue.message,
        priority: issue.severity === 'error' ? 'high' : 'medium',
        phase: phase.phase,
        file: issue.file,
        autoFixable: false,
      });
    });
  });

  const finalStatus = phases.some(p => p.status === 'failed' && p.blocking) ? 'failed' : 'passed';

  return {
    id: `review-${Date.now()}`,
    date: new Date().toISOString(),
    commitHash: gitInfo.commitHash,
    branch: gitInfo.branch,
    startTime: phases[0]?.startTime || new Date(),
    endTime: phases[phases.length - 1]?.endTime,
    totalDuration: phases.reduce((sum, p) => sum + (p.duration || 0), 0),
    phases,
    finalStatus,
    actionItems,
    config: preDeployConfig,
  };
}

function generateMarkdownReport(report: ReviewReport): string {
  const lines: string[] = [
    '# Pre-Deploy Review Report',
    '',
    `**Date:** ${new Date(report.date).toLocaleString()}`,
    `**Commit:** ${report.commitHash}`,
    `**Branch:** ${report.branch}`,
    `**Duration:** ${formatDuration(report.totalDuration || 0)}`,
    '',
    '## Summary',
    '',
    '| Phase | Status | Duration | Issues |',
    '|-------|--------|----------|--------|',
  ];

  report.phases.forEach(phase => {
    const statusIcon = ICONS[phase.status];
    const duration = formatDuration(phase.duration || 0);
    lines.push(`| ${phase.phaseName} | ${statusIcon} ${phase.status} | ${duration} | ${phase.issues.length} |`);
  });

  lines.push('');
  lines.push(`**Final Status:** ${ICONS[report.finalStatus]} ${report.finalStatus.toUpperCase()}`);
  lines.push('');

  // Details per phase
  report.phases.forEach(phase => {
    lines.push(`## ${phase.phaseName}`);
    lines.push('');
    lines.push(`- **Status:** ${phase.status}`);
    lines.push(`- **Blocking:** ${phase.blocking ? 'Yes' : 'No'}`);
    lines.push(`- **Duration:** ${formatDuration(phase.duration || 0)}`);
    lines.push('');

    if (Object.keys(phase.summary).length > 0) {
      lines.push('### Summary');
      lines.push('```json');
      lines.push(JSON.stringify(phase.summary, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (phase.issues.length > 0) {
      lines.push('### Issues');
      phase.issues.forEach(issue => {
        lines.push(`- **${issue.severity.toUpperCase()}:** ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  - 💡 ${issue.suggestion}`);
        }
      });
      lines.push('');
    }
  });

  // Action items
  if (report.actionItems.length > 0) {
    lines.push('## Action Items');
    lines.push('');
    report.actionItems.forEach(item => {
      lines.push(`- [ ] **[${item.priority.toUpperCase()}]** ${item.description} (${item.phase})`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by Pre-Deploy Review Tool*');

  return lines.join('\n');
}

function saveReport(report: ReviewReport): void {
  const reportsDir = path.join(__dirname, '../docs/reports');

  // Ensure directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const baseName = `pre-deploy-${dateStr}-${timeStr}`;

  // Save markdown
  const mdPath = path.join(reportsDir, `${baseName}.md`);
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  log(`\n📄 Report saved: ${mdPath}`, COLORS.green);

  // Save JSON
  const jsonPath = path.join(reportsDir, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  log(`📄 JSON saved: ${jsonPath}`, COLORS.green);
}

// ===================
// MAIN
// ===================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const specificPhase = args.find(a => a.startsWith('--phase='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const useRalph = args.includes('--ralph');

  log('\n' + '='.repeat(60), COLORS.cyan);
  log('  PRE-DEPLOY REVIEW', COLORS.bright);
  log('='.repeat(60), COLORS.cyan);

  const gitInfo = getGitInfo();
  log(`\nBranch: ${gitInfo.branch}`, COLORS.dim);
  log(`Commit: ${gitInfo.commitHash}`, COLORS.dim);

  if (dryRun) {
    log('\n⚠️  DRY RUN MODE - Commands will not be executed\n', COLORS.yellow);
  }

  const phases: PhaseResult[] = [];
  const phaseRunners: Array<{ name: string; runner: () => Promise<PhaseResult> }> = [
    { name: 'phase0', runner: runPhase0 },
    { name: 'phase1', runner: runPhase1 },
    { name: 'phase2', runner: () => runPhase2(useRalph) },
    { name: 'phase3', runner: runPhase3 },
    { name: 'phase4', runner: runPhase4 },
    { name: 'phase5', runner: runPhase5 },
  ];

  let aborted = false;

  for (const { name, runner } of phaseRunners) {
    // Skip if specific phase requested and this isn't it
    if (specificPhase && name !== `phase${specificPhase}`) {
      continue;
    }

    // Skip if phase is disabled
    if (!isPhaseEnabled(name)) {
      logPhase(name, 'skipped', 'Phase disabled in config');
      continue;
    }

    // Skip if previous blocking phase failed
    if (aborted) {
      logPhase(name, 'skipped', 'Skipped due to previous failure');
      continue;
    }

    logPhase(name, 'running');

    if (dryRun) {
      const commands = getPhaseCommands(name);
      Object.entries(commands).forEach(([, cmd]) => {
        log(`   Would run: ${cmd}`, COLORS.dim);
      });
      continue;
    }

    try {
      const result = await runner();
      phases.push(result);

      logPhase(name, result.status, `Completed in ${formatDuration(result.duration || 0)}`);

      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          const icon = issue.severity === 'error' ? '❌' : '⚠️';
          log(`   ${icon} ${issue.message}`, issue.severity === 'error' ? COLORS.red : COLORS.yellow);
        });
      }

      // Check if we should abort
      if (result.status === 'failed' && result.blocking) {
        aborted = true;
        log('\n🛑 Blocking phase failed. Aborting remaining phases.', COLORS.red);
      }
    } catch (error) {
      log(`\n❌ Error running ${name}: ${error}`, COLORS.red);
      aborted = true;
    }
  }

  if (!dryRun && phases.length > 0) {
    // Generate and save report
    const report = generateReport(phases, gitInfo);
    saveReport(report);

    // Final summary
    log('\n' + '='.repeat(60), COLORS.cyan);
    log('  FINAL RESULT', COLORS.bright);
    log('='.repeat(60), COLORS.cyan);

    const passed = phases.filter(p => p.status === 'passed').length;
    const failed = phases.filter(p => p.status === 'failed').length;
    const warnings = phases.filter(p => p.status === 'warning').length;

    log(`\n  ✅ Passed: ${passed}`, COLORS.green);
    if (warnings > 0) log(`  ⚠️  Warnings: ${warnings}`, COLORS.yellow);
    if (failed > 0) log(`  ❌ Failed: ${failed}`, COLORS.red);

    log('');
    if (report.finalStatus === 'passed') {
      log('  🎉 READY TO DEPLOY!', COLORS.green);
    } else {
      log('  🚫 NOT READY - Fix blocking issues first', COLORS.red);
    }
    log('\n');

    process.exit(report.finalStatus === 'passed' ? 0 : 1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
