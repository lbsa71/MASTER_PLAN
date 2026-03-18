/**
 * Autonomous Colony Seeding — Viability Decision Engine (Phase 1)
 *
 * Implements IViabilityDecisionEngine: makes the autonomous GO/ABORT/DORMANCY
 * decision for colony establishment based on surveyed system data.
 *
 * Decision criteria (all must pass for GO):
 *   1. Energy budget: achievable sustained power ≥ 1 GW solar equivalent
 *   2. Resource inventory: structural metals ≥ 10^18 kg, semiconductors ≥ 10^12 kg
 *   3. Radiation environment: within hardened substrate tolerance
 *   4. Orbital stability: ≥ 100 Myr stable configuration exists
 *
 * Abort protocol: dormancy up to 10 kyr then retry; relay telemetry to origin.
 * Conservative Advancement Principle: never proceed on partial or uncertain data.
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §1.2
 */

import { IViabilityDecisionEngine } from "./interfaces";
import {
  SystemMap,
  ViabilityAssessment,
  ColonySite,
  AbortDecision,
  BootstrapPlan,
  ColonySiteDecision,
  ColonySiteDecisionType,
  DecisionRecord,
  EnergyMilestone,
  EnergyMilestoneId,
  ENERGY_MILESTONES,
  ExpansionSchedule,
  SubstrateSpec,
  EstimatedTime,
  MIN_RESOURCE_REQUIREMENTS,
  MIN_ORBITAL_STABILITY_MYR,
  MIN_ENERGY_GW,
  COLONY_FAB_THRESHOLD,
  MIN_CONSCIOUSNESS_SUBSTRATE,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum dormancy period in years before redirecting to next candidate */
const MAX_DORMANCY_YEARS = 10_000;

/** Retry interval within dormancy period (years) */
const DORMANCY_RETRY_INTERVAL_YEARS = 1_000;

/** Minimum viable conscious population for initial colony */
const INITIAL_COHORT_SIZE = 100;

// ── ViabilityDecisionEngine implementation ───────────────────────────────────

/**
 * Makes the autonomous Phase 1 GO/ABORT/DORMANCY decision for colony
 * establishment and generates the bootstrap plan when GO is issued.
 */
export class ViabilityDecisionEngine implements IViabilityDecisionEngine {
  // ── IViabilityDecisionEngine ─────────────────────────────────────────────

  /**
   * Evaluate a surveyed system against all GO criteria.
   *
   * Each criterion is assessed independently; the overall viability score is
   * the fraction of criteria met (0–1). All four must pass for GO.
   */
  evaluate(survey: SystemMap): ViabilityAssessment {
    const meetsEnergyRequirement = survey.energyBudget.meetsMinimumThreshold;
    const meetsResourceRequirement = this.resourcesAdequate(survey);
    const withinRadiationTolerance = survey.radiationProfile.withinHardenedTolerance;
    const hasStableOrbit = this.orbitStable(survey);

    const criteria = [
      meetsEnergyRequirement,
      meetsResourceRequirement,
      withinRadiationTolerance,
      hasStableOrbit,
    ];
    const metCount = criteria.filter(Boolean).length;
    const viabilityScore = metCount / criteria.length;
    const overallViable = criteria.every(Boolean);

    return {
      meetsEnergyRequirement,
      meetsResourceRequirement,
      withinRadiationTolerance,
      hasStableOrbit,
      overallViable,
      viabilityScore,
    };
  }

  /**
   * Select the optimal colony site from the system survey.
   *
   * If all GO criteria are met, returns the best ColonySite (the body or orbital
   * zone with the highest combined energy and resource score).  If criteria are
   * partially met and recovery is plausible within dormancy limits, returns an
   * AbortDecision with DORMANCY recommendation.  Otherwise returns ABORT.
   */
  selectColonySite(survey: SystemMap): ColonySite | AbortDecision {
    const assessment = this.evaluate(survey);

    if (assessment.overallViable) {
      return this.buildColonySite(survey);
    }

    // Determine whether dormancy is worthwhile
    const recoverable = this.isRecoverable(assessment);
    if (recoverable) {
      return {
        reason: this.buildAbortRationale(assessment, true),
        retryAfter_years: DORMANCY_RETRY_INTERVAL_YEARS,
      } satisfies AbortDecision;
    }

    return {
      reason: this.buildAbortRationale(assessment, false),
      alternativeSystem: "Next candidate in swarm manifest",
    } satisfies AbortDecision;
  }

  /**
   * Generate a full bootstrap plan for a chosen colony site.
   *
   * The plan covers all four phases with conservative timeline estimates,
   * energy milestones, manufacturing schedule, substrate spec, and estimated
   * mind-seed activation time.
   */
  generateBootstrapPlan(site: ColonySite): BootstrapPlan {
    const energyMilestones: EnergyMilestone[] = ENERGY_MILESTONES;

    // Phase 2: manufacturing expansion — estimate ~10 cycles of ~50 years each
    const manufacturingSchedule: ExpansionSchedule = {
      cycleCount: 10,
      estimatedCycleDuration_years: 50,
      targetCapacity: COLONY_FAB_THRESHOLD,
    };

    const substrateSpec: SubstrateSpec = {
      ...MIN_CONSCIOUSNESS_SUBSTRATE,
      // Tailor radiation hardening to site profile
      radiationHardened: true,
      selfRepairEnabled: true,
    };

    // Phase 2 duration: manufacturing cycles
    const phase2Duration_years =
      manufacturingSchedule.cycleCount * manufacturingSchedule.estimatedCycleDuration_years;

    // Phase 3 duration: substrate fabrication + verification
    const phase3Duration_years = 200;

    // Phase 4 duration: conscious instantiation + civilisation boot
    const phase4Duration_years = 500;

    const totalDuration_years = phase2Duration_years + phase3Duration_years + phase4Duration_years;

    const mindSeedActivationTime: EstimatedTime = {
      duration_years: phase2Duration_years + phase3Duration_years,
      uncertainty_years: 200,
    };

    const totalDuration: EstimatedTime = {
      duration_years: totalDuration_years,
      uncertainty_years: 500,
    };

    return {
      selectedSite: site,
      energyMilestones,
      manufacturingSchedule,
      substrateSpec,
      mindSeedActivationTime,
      totalDuration,
    };
  }

  /**
   * Log the final GO/ABORT/DORMANCY decision as a durable, relayable record.
   *
   * The record is relayed toward the origin civilization; given multi-century
   * one-way delays, the origin receives this as a historical notification only.
   */
  reportDecision(decision: ColonySiteDecision): DecisionRecord {
    const now = Date.now();

    switch (decision.type) {
      case ColonySiteDecisionType.GO:
        return {
          decision: ColonySiteDecisionType.GO,
          rationale: `GO issued. Colony site ${decision.site.id} selected. Bootstrap plan generated covering all four phases.`,
          viabilityScore: 1.0,
          projectedBootstrapDuration: decision.plan.totalDuration,
          alternativeRecommendation: null,
          timestamp_ms: now,
        };

      case ColonySiteDecisionType.DORMANCY:
        return {
          decision: ColonySiteDecisionType.DORMANCY,
          rationale: decision.abort.reason,
          viabilityScore: 0,
          projectedBootstrapDuration: {
            duration_years: MAX_DORMANCY_YEARS,
            uncertainty_years: MAX_DORMANCY_YEARS,
          },
          alternativeRecommendation: decision.abort.alternativeSystem ?? null,
          timestamp_ms: now,
        };

      case ColonySiteDecisionType.ABORT:
        return {
          decision: ColonySiteDecisionType.ABORT,
          rationale: decision.abort.reason,
          viabilityScore: 0,
          projectedBootstrapDuration: { duration_years: 0, uncertainty_years: 0 },
          alternativeRecommendation: decision.abort.alternativeSystem ?? null,
          timestamp_ms: now,
        };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Check whether system resource inventory meets minimum requirements.
   *
   * Both structural metals and semiconductor feedstock must individually
   * meet their minimums; there is no cross-substitution.
   */
  private resourcesAdequate(survey: SystemMap): boolean {
    return (
      survey.resourceInventory.structuralMetals_kg >=
        MIN_RESOURCE_REQUIREMENTS.structuralMetals_kg &&
      survey.resourceInventory.semiconductors_kg >=
        MIN_RESOURCE_REQUIREMENTS.semiconductors_kg
    );
  }

  /**
   * Estimate orbital stability from the survey's radiation profile.
   *
   * A system is considered orbitally stable if, at its current luminosity
   * and the absence of extreme stellar activity, at least one zone exceeds
   * MIN_ORBITAL_STABILITY_MYR.  We derive a proxy from the energy budget:
   * if energy is achievable at ≤ 2 AU with the current luminosity, the zone
   * is likely long-lived.  Remnant systems are flagged as unstable.
   */
  private orbitStable(survey: SystemMap): boolean {
    // Conservative proxy: ensure at least one body is within a zone that
    // would be stable for ≥ 100 Myr.  We check that an accessible resource
    // body exists with an orbital radius consistent with a long-lived zone.
    if (survey.bodies.length === 0) return false;

    const hasStableBody = survey.bodies.some(
      (b) =>
        b.orbitalRadius_au >= 0.5 &&
        b.orbitalRadius_au <= 10 &&
        survey.energyBudget.solarPower_w > 0,
    );

    // Remnant stars have unpredictable long-term environments
    const luminosity = survey.radiationProfile.stellarLuminosity_Lsun;
    const isRemnant = luminosity <= 0.001;

    // High-luminosity (O/B) stars exhaust too quickly for ≥ 100 Myr stability
    const isTransient = luminosity > 10_000;

    return hasStableBody && !isRemnant && !isTransient;
  }

  /**
   * Determine whether dormancy and retry could yield a viable system.
   *
   * Dormancy is worthwhile if the primary shortfall is recoverable: for example,
   * if energy or resources are marginal but within a factor of 10, or if
   * radiation is the only failing criterion (flare cycles may calm over millennia).
   * It is not worthwhile for fundamental resource or orbital-stability failures.
   */
  private isRecoverable(assessment: ViabilityAssessment): boolean {
    const failCount = [
      assessment.meetsEnergyRequirement,
      assessment.meetsResourceRequirement,
      assessment.withinRadiationTolerance,
      assessment.hasStableOrbit,
    ].filter((v) => !v).length;

    // Only single-criterion failures with a radiation or energy root-cause
    // are plausibly recoverable within the dormancy window.
    if (failCount > 1) return false;
    if (!assessment.hasStableOrbit) return false;
    if (!assessment.meetsResourceRequirement) return false;
    return true;
  }

  /**
   * Build a ColonySite from the best available zone in the survey.
   *
   * Selects the body (or inner-system orbital zone) with the highest combined
   * resource inventory score, prioritising bodies within 2 AU of the star for
   * energy access.
   */
  private buildColonySite(survey: SystemMap): ColonySite {
    // Score each body by resource total and proximity to star
    const scored = survey.bodies.map((b) => ({
      body: b,
      score:
        b.composition.structuralMetals_kg / 1e18 +
        b.composition.semiconductors_kg / 1e12 -
        Math.abs(b.orbitalRadius_au - 2) * 0.1, // slight preference for ~2 AU
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0]?.body ?? survey.bodies[0]!;

    const orbitalRadius_au = Math.min(Math.max(best.orbitalRadius_au, 0.5), 4.0);

    return {
      id: `site-${best.id}`,
      orbitalPosition: {
        radius_au: orbitalRadius_au,
        stabilityDuration_Myr:
          survey.radiationProfile.withinHardenedTolerance ? 5_000 : MIN_ORBITAL_STABILITY_MYR,
      },
      projectedEnergyBudget: survey.energyBudget,
      accessibleResources: survey.resourceInventory,
      riskProfile: this.buildRiskProfile(survey),
    };
  }

  /** Compose a human-readable risk profile string from survey data */
  private buildRiskProfile(survey: SystemMap): string {
    const parts: string[] = [];
    if (!survey.radiationProfile.withinHardenedTolerance) {
      parts.push("elevated radiation — additional shielding required");
    }
    if (survey.energyBudget.solarPower_w < MIN_ENERGY_GW * 10) {
      parts.push("marginal energy — extended collector build-out required");
    }
    if (survey.resourceInventory.structuralMetals_kg < MIN_RESOURCE_REQUIREMENTS.structuralMetals_kg * 10) {
      parts.push("marginal structural metals — asteroid mining essential");
    }
    return parts.length > 0 ? parts.join("; ") : "nominal";
  }

  /** Build a human-readable rationale string for an abort or dormancy decision */
  private buildAbortRationale(assessment: ViabilityAssessment, dormancy: boolean): string {
    const failures: string[] = [];
    if (!assessment.meetsEnergyRequirement) failures.push("energy budget below 1 GW threshold");
    if (!assessment.meetsResourceRequirement) failures.push("resource inventory below minimum");
    if (!assessment.withinRadiationTolerance) failures.push("radiation environment exceeds hardened substrate tolerance");
    if (!assessment.hasStableOrbit) failures.push("no stable orbital zone ≥ 100 Myr found");
    const prefix = dormancy ? "DORMANCY" : "ABORT";
    return `${prefix}: ${failures.join("; ")}.`;
  }
}
