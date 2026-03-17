/**
 * Software Diagnostic Engine (SDE)
 *
 * Implements ISoftwareDiagnostics — monitors all software layers for
 * corruption, configuration drift, and behavioral anomalies.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §1.2
 */

import type {
  SoftwareDiagnosticFinding,
  SoftwareHealthSnapshot,
  IntegrityCheckResult,
  SoftwareFaultCategory,
  FaultSeverity,
  Timestamp,
} from "./types.js";
import type {
  ISoftwareDiagnostics,
  SoftwareFaultHandler,
  Unsubscribe,
} from "./interfaces.js";

// ── Internal types ────────────────────────────────────────────

interface ModuleConfig {
  readonly expectedChecksum: string;
  readonly isConsciousnessSubstrate: boolean;
}

interface MemoryFaultInput {
  readonly moduleId: string;
  readonly severity: FaultSeverity;
  readonly details: string;
  readonly isConsciousnessSubstrate: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function now(): Timestamp {
  return Date.now();
}

// ── Implementation ────────────────────────────────────────────

export class SoftwareDiagnosticEngine implements ISoftwareDiagnostics {
  private readonly moduleConfigs = new Map<string, ModuleConfig>();
  private readonly actualChecksums = new Map<string, string>();
  private readonly memoryFaults: SoftwareDiagnosticFinding[] = [];
  private readonly goldenConfigs = new Map<string, string>();
  private readonly currentConfigs = new Map<string, string>();
  private readonly handlers = new Set<SoftwareFaultHandler>();

  // ── ISoftwareDiagnostics ───────────────────────────────────

  getHealthSnapshot(): SoftwareHealthSnapshot {
    const integrityChecks = this.buildIntegrityChecks();
    const integrityFindings = integrityChecks
      .filter((c) => !c.intact)
      .map((c): SoftwareDiagnosticFinding => {
        const config = this.moduleConfigs.get(c.moduleId);
        return {
          moduleId: c.moduleId,
          category: "INTEGRITY_VIOLATION",
          severity: config?.isConsciousnessSubstrate ? "EMERGENCY" : "CRITICAL",
          details: `Checksum mismatch: expected ${c.checksumExpected}, got ${c.checksumActual}`,
          isConsciousnessSubstrate: config?.isConsciousnessSubstrate ?? false,
          timestamp: c.timestamp,
        };
      });

    const allFindings = [...integrityFindings, ...this.memoryFaults];
    const health =
      allFindings.length === 0
        ? 1.0
        : Math.max(0, 1 - allFindings.length / Math.max(1, this.moduleConfigs.size + 1));

    return {
      findings: allFindings,
      integrityChecks,
      overallHealth: health,
      timestamp: now(),
    };
  }

  async verifyFirmwareIntegrity(): Promise<IntegrityCheckResult[]> {
    return this.buildIntegrityChecks().filter(
      (c) => !this.moduleConfigs.get(c.moduleId)?.isConsciousnessSubstrate
    );
  }

  async checkMemoryHealth(): Promise<SoftwareDiagnosticFinding[]> {
    return [...this.memoryFaults];
  }

  async getConfigurationDrift(): Promise<SoftwareDiagnosticFinding[]> {
    const findings: SoftwareDiagnosticFinding[] = [];
    for (const [id, goldenHash] of this.goldenConfigs) {
      const current = this.currentConfigs.get(id);
      if (current !== undefined && current !== goldenHash) {
        findings.push({
          moduleId: id,
          category: "CONFIGURATION_ERROR",
          severity: "WARNING",
          details: `Config drift detected: expected ${goldenHash}, got ${current}`,
          isConsciousnessSubstrate: false,
          timestamp: now(),
        });
      }
    }
    return findings;
  }

  async getConsciousnessSubstrateIntegrity(): Promise<IntegrityCheckResult[]> {
    return this.buildIntegrityChecks().filter(
      (c) => this.moduleConfigs.get(c.moduleId)?.isConsciousnessSubstrate ?? false
    );
  }

  onSoftwareFaultDetected(handler: SoftwareFaultHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async runFullScan(): Promise<SoftwareHealthSnapshot> {
    // Combines integrity checks, memory faults, and config drift
    const integrityChecks = this.buildIntegrityChecks();
    const configDrift = await this.getConfigurationDrift();
    const memoryFaults = [...this.memoryFaults];

    const integrityFindings = integrityChecks
      .filter((c) => !c.intact)
      .map((c): SoftwareDiagnosticFinding => {
        const config = this.moduleConfigs.get(c.moduleId);
        return {
          moduleId: c.moduleId,
          category: "INTEGRITY_VIOLATION",
          severity: config?.isConsciousnessSubstrate ? "EMERGENCY" : "CRITICAL",
          details: `Checksum mismatch: expected ${c.checksumExpected}, got ${c.checksumActual}`,
          isConsciousnessSubstrate: config?.isConsciousnessSubstrate ?? false,
          timestamp: c.timestamp,
        };
      });

    const allFindings = [...integrityFindings, ...memoryFaults, ...configDrift];
    const health =
      allFindings.length === 0
        ? 1.0
        : Math.max(0, 1 - allFindings.length / Math.max(1, this.moduleConfigs.size + 1));

    return {
      findings: allFindings,
      integrityChecks,
      overallHealth: health,
      timestamp: now(),
    };
  }

  // ── Extra surface used by tests ────────────────────────────

  /**
   * Register a software module with its expected checksum.
   */
  registerModule(moduleId: string, config: ModuleConfig): void {
    this.moduleConfigs.set(moduleId, config);
  }

  /**
   * Report the currently observed checksum for a module.
   * If it differs from expected, emits a software fault event.
   */
  reportChecksum(moduleId: string, actualChecksum: string): void {
    this.actualChecksums.set(moduleId, actualChecksum);

    const config = this.moduleConfigs.get(moduleId);
    if (!config) return;

    if (actualChecksum !== config.expectedChecksum) {
      const finding: SoftwareDiagnosticFinding = {
        moduleId,
        category: "INTEGRITY_VIOLATION",
        severity: config.isConsciousnessSubstrate ? "EMERGENCY" : "CRITICAL",
        details: `Checksum mismatch: expected ${config.expectedChecksum}, got ${actualChecksum}`,
        isConsciousnessSubstrate: config.isConsciousnessSubstrate,
        timestamp: now(),
      };
      for (const handler of this.handlers) {
        handler(finding);
      }
    }
  }

  /**
   * Report a memory fault directly (e.g. ECC error, bad memory region).
   */
  reportMemoryFault(input: MemoryFaultInput): void {
    const finding: SoftwareDiagnosticFinding = {
      moduleId: input.moduleId,
      category: "MEMORY_CORRUPTION",
      severity: input.severity,
      details: input.details,
      isConsciousnessSubstrate: input.isConsciousnessSubstrate,
      timestamp: now(),
    };
    this.memoryFaults.push(finding);
  }

  /**
   * Register the authoritative (golden) configuration hash for a config target.
   */
  registerGoldenConfig(configId: string, hash: string): void {
    this.goldenConfigs.set(configId, hash);
  }

  /**
   * Report the currently observed configuration hash.
   */
  reportCurrentConfig(configId: string, hash: string): void {
    this.currentConfigs.set(configId, hash);
  }

  // ── Private helpers ────────────────────────────────────────

  private buildIntegrityChecks(): IntegrityCheckResult[] {
    const results: IntegrityCheckResult[] = [];
    for (const [moduleId, config] of this.moduleConfigs) {
      const actual = this.actualChecksums.get(moduleId);
      if (actual === undefined) continue;
      results.push({
        moduleId,
        checksumExpected: config.expectedChecksum,
        checksumActual: actual,
        intact: actual === config.expectedChecksum,
        timestamp: now(),
      });
    }
    return results;
  }
}
