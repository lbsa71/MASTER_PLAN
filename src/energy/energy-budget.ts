/**
 * Energy Budget (EB)
 *
 * Predictive model that forecasts energy income vs expenditure
 * and constrains activity planning to the available energy envelope.
 *
 * Every activity plan must be checked against the energy budget.
 * The budget always reserves a consciousness protection margin:
 *   margin = consciousnessPowerDraw × (forecastHorizon + safetyFactor)
 *   availableForActivity = storedEnergy - margin - failSafeReserve
 *
 * Where safetyFactor defaults to 2× the forecast horizon (conservative).
 */

import { IEnergyBudget } from "./interfaces";
import { IPrimaryStorage } from "./interfaces";
import { IHarvesterCoordinator } from "./interfaces";
import { IFailSafeReserve } from "./interfaces";
import { IPowerManager } from "./interfaces";
import {
  ActivityPlan,
  Affordability,
  AffordabilityResult,
  BudgetWarningHandler,
  ConstrainedPlan,
  Duration,
  EnergyBalance,
  EnergyForecast,
  EnergyMeasurement,
  EnergyPattern,
  PowerMeasurement,
  duration,
  wattHours,
  watts,
} from "./types";

/** Consciousness substrate draw — must match PSB/FSR assumption */
const CONSCIOUSNESS_DRAW_WATTS = 30;

/** Default forecast horizon used for consciousness reserve calculations (hours) */
const DEFAULT_FORECAST_HORIZON_HOURS = 24;

/** Safety factor: multiply forecast horizon by this for reserve margin */
const SAFETY_FACTOR = 2;

/**
 * Threshold below which a budget warning is issued.
 * Expressed as ratio of available energy to consciousness margin.
 * When available drops below 1.5× the consciousness margin, warn.
 */
const WARNING_RATIO = 1.5;

/** Minimum margin threshold — never let available energy for activities
 *  be less than this many hours of consciousness draw */
const MIN_CONSCIOUSNESS_MARGIN_HOURS = 12;

export class EnergyBudget implements IEnergyBudget {
  private readonly psb: IPrimaryStorage;
  private readonly coordinator: IHarvesterCoordinator;
  private readonly fsr: IFailSafeReserve;
  private readonly powerManager: IPowerManager;

  private warningHandlers: BudgetWarningHandler[] = [];

  /** Rolling history of income/expenditure snapshots for pattern analysis */
  private history: Array<{
    timestamp: number;
    incomeWatts: number;
    expenditureWatts: number;
  }> = [];

  /** Max history entries (one per second for 24 hours = 86400) */
  private readonly maxHistoryEntries: number;

  constructor(
    psb: IPrimaryStorage,
    coordinator: IHarvesterCoordinator,
    fsr: IFailSafeReserve,
    powerManager: IPowerManager,
    maxHistoryEntries = 86_400
  ) {
    this.psb = psb;
    this.coordinator = coordinator;
    this.fsr = fsr;
    this.powerManager = powerManager;
    this.maxHistoryEntries = maxHistoryEntries;
  }

  // ─── IEnergyBudget ──────────────────────────────────────────────────

  getCurrentBalance(): EnergyBalance {
    const stored = this.psb.getStoredEnergy();
    const incomeRate = this.getIncomeRate();
    const expenditureRate = this.getExpenditureRate();
    const netRate = watts(incomeRate.watts - expenditureRate.watts);
    const consciousnessHours =
      stored.wattHours / CONSCIOUSNESS_DRAW_WATTS;

    return {
      stored,
      incomeRate,
      expenditureRate,
      netRate,
      consciousnessReserveHorizon: duration(consciousnessHours * 3600 * 1000),
    };
  }

  /**
   * Forecast energy balance over the given horizon.
   *
   * Uses current rates projected forward. Confidence decreases
   * with longer horizons.
   */
  getForecast(horizon: Duration): EnergyForecast {
    const horizonHours = horizon.ms / (3600 * 1000);
    const incomeRate = this.getIncomeRate();
    const expenditureRate = this.getExpenditureRate();

    const expectedIncome = wattHours(incomeRate.watts * horizonHours);
    const expectedExpenditure = wattHours(expenditureRate.watts * horizonHours);

    const currentStored = this.psb.getStoredEnergy().wattHours;
    const projectedBalance = wattHours(
      currentStored + expectedIncome.wattHours - expectedExpenditure.wattHours
    );

    // Consciousness is at risk if projected balance can't sustain
    // consciousness draw for the safety margin period
    const marginWh = this.getConsciousnessMarginWh(horizonHours);
    const consciousnessAtRisk = projectedBalance.wattHours < marginWh;

    // Confidence decreases with horizon length
    // 1.0 at 0h, ~0.8 at 1h, ~0.5 at 12h, ~0.3 at 24h
    const confidence = Math.max(0.1, 1.0 / (1 + horizonHours / 10));

    return {
      horizon,
      expectedIncome,
      expectedExpenditure,
      projectedBalance,
      consciousnessAtRisk,
      confidence,
    };
  }

  /**
   * How long can consciousness run on stored PSB energy alone
   * (not counting FSR, which is a last resort).
   */
  getConsciousnessReserveHorizon(): Duration {
    const storedWh = this.psb.getStoredEnergy().wattHours;
    const hours = storedWh / CONSCIOUSNESS_DRAW_WATTS;
    return duration(hours * 3600 * 1000);
  }

  /**
   * Check whether an activity is affordable within the energy budget.
   *
   * Affordability calculation:
   *   margin = consciousnessDraw × (forecastHorizon + safetyFactor × forecastHorizon)
   *   available = storedEnergy - margin
   *   (FSR is never counted as available — it's reserved for consciousness fail-safe)
   */
  canAffordActivity(activity: ActivityPlan): AffordabilityResult {
    const storedWh = this.psb.getStoredEnergy().wattHours;
    const requiredWh = activity.estimatedEnergyCost.wattHours;
    const durationHours = activity.estimatedDuration.ms / (3600 * 1000);

    // Calculate consciousness protection margin
    const forecastHorizon = Math.max(durationHours, DEFAULT_FORECAST_HORIZON_HOURS);
    const marginWh = this.getConsciousnessMarginWh(forecastHorizon);

    // Available energy for activities = stored - margin
    // (FSR is never available for activities)
    const availableWh = Math.max(0, storedWh - marginWh);

    // Factor in expected income during the activity
    const incomeRate = this.getIncomeRate();
    const expectedIncomeWh = incomeRate.watts * durationHours;
    const totalAvailableWh = availableWh + expectedIncomeWh;

    if (totalAvailableWh >= requiredWh * 1.5) {
      return {
        affordability: Affordability.AFFORDABLE,
        availableEnergy: wattHours(totalAvailableWh),
        requiredEnergy: wattHours(requiredWh),
        consciousnessMargin: wattHours(marginWh),
        message: `Activity affordable with ${((totalAvailableWh / requiredWh) * 100).toFixed(0)}% margin`,
      };
    }

    if (totalAvailableWh >= requiredWh) {
      return {
        affordability: Affordability.MARGINAL,
        availableEnergy: wattHours(totalAvailableWh),
        requiredEnergy: wattHours(requiredWh),
        consciousnessMargin: wattHours(marginWh),
        message: `Activity affordable but margin is thin (${((totalAvailableWh / requiredWh) * 100).toFixed(0)}%). Consider constraining.`,
      };
    }

    return {
      affordability: Affordability.UNAFFORDABLE,
      availableEnergy: wattHours(totalAvailableWh),
      requiredEnergy: wattHours(requiredWh),
      consciousnessMargin: wattHours(marginWh),
      message: `Activity would breach consciousness protection margin. Available: ${totalAvailableWh.toFixed(1)} Wh, Required: ${requiredWh.toFixed(1)} Wh`,
    };
  }

  /**
   * Constrain an activity plan to fit within the available energy envelope.
   *
   * Strategy: scale the activity duration (and thus energy cost) down
   * to fit within what's affordable, preserving consciousness margin.
   */
  constrainPlan(plan: ActivityPlan): ConstrainedPlan {
    const affordability = this.canAffordActivity(plan);

    if (affordability.affordability === Affordability.AFFORDABLE) {
      return {
        originalPlan: plan,
        constrainedPlan: plan,
        wasConstrained: false,
        constraints: [],
      };
    }

    const availableWh = affordability.availableEnergy.wattHours;
    const requiredWh = plan.estimatedEnergyCost.wattHours;

    if (availableWh <= 0 || requiredWh <= 0) {
      return {
        originalPlan: plan,
        constrainedPlan: {
          ...plan,
          estimatedDuration: duration(0),
          estimatedEnergyCost: wattHours(0),
        },
        wasConstrained: true,
        constraints: ["Insufficient energy — activity cancelled"],
      };
    }

    // Scale down proportionally to available energy
    const scaleFactor = Math.min(1.0, availableWh / requiredWh);
    const constraints: string[] = [];

    if (scaleFactor < 1.0) {
      constraints.push(
        `Duration reduced to ${(scaleFactor * 100).toFixed(0)}% of original`
      );
      constraints.push(
        `Energy cost reduced from ${requiredWh.toFixed(1)} Wh to ${(requiredWh * scaleFactor).toFixed(1)} Wh`
      );
    }

    if (affordability.affordability === Affordability.MARGINAL) {
      constraints.push("Operating with thin energy margin — monitor closely");
    }

    const constrainedPlan: ActivityPlan = {
      id: plan.id,
      name: plan.name,
      estimatedDuration: duration(plan.estimatedDuration.ms * scaleFactor),
      estimatedEnergyCost: wattHours(requiredWh * scaleFactor),
      priority: plan.priority,
    };

    return {
      originalPlan: plan,
      constrainedPlan,
      wasConstrained: scaleFactor < 1.0 || affordability.affordability === Affordability.MARGINAL,
      constraints,
    };
  }

  getIncomeRate(): PowerMeasurement {
    return this.coordinator.getTotalHarvestRate();
  }

  getExpenditureRate(): PowerMeasurement {
    return this.powerManager.getTotalDemand();
  }

  /**
   * Analyze historical energy patterns over the given period.
   *
   * Returns average, peak, and minimum income/expenditure rates
   * observed during the requested period.
   */
  getHistoricalPattern(period: Duration): EnergyPattern {
    const cutoff = Date.now() - period.ms;
    const relevant = this.history.filter((h) => h.timestamp >= cutoff);

    if (relevant.length === 0) {
      // No history — return current rates as best estimate
      const income = this.getIncomeRate();
      const expenditure = this.getExpenditureRate();
      return {
        period,
        averageIncome: income,
        averageExpenditure: expenditure,
        peakIncome: income,
        minIncome: income,
      };
    }

    let totalIncome = 0;
    let totalExpenditure = 0;
    let peakIncome = 0;
    let minIncome = Infinity;

    for (const entry of relevant) {
      totalIncome += entry.incomeWatts;
      totalExpenditure += entry.expenditureWatts;
      if (entry.incomeWatts > peakIncome) peakIncome = entry.incomeWatts;
      if (entry.incomeWatts < minIncome) minIncome = entry.incomeWatts;
    }

    const count = relevant.length;
    return {
      period,
      averageIncome: watts(totalIncome / count),
      averageExpenditure: watts(totalExpenditure / count),
      peakIncome: watts(peakIncome),
      minIncome: watts(minIncome === Infinity ? 0 : minIncome),
    };
  }

  onBudgetWarning(callback: BudgetWarningHandler): void {
    this.warningHandlers.push(callback);
  }

  // ─── Tick (called each system cycle) ───────────────────────────────

  /**
   * Record current snapshot and check for budget warnings.
   * Should be called on every system tick.
   */
  tick(): void {
    const income = this.getIncomeRate().watts;
    const expenditure = this.getExpenditureRate().watts;

    // Record history
    this.history.push({
      timestamp: Date.now(),
      incomeWatts: income,
      expenditureWatts: expenditure,
    });

    // Trim history if over limit
    if (this.history.length > this.maxHistoryEntries) {
      this.history.splice(0, this.history.length - this.maxHistoryEntries);
    }

    // Check for budget warnings
    this.checkWarnings();
  }

  // ─── Private ───────────────────────────────────────────────────────

  /**
   * Calculate the consciousness protection margin in Wh.
   *
   * margin = consciousnessDraw × forecastHorizon × (1 + safetyFactor)
   *
   * Never less than MIN_CONSCIOUSNESS_MARGIN_HOURS of consciousness draw.
   */
  private getConsciousnessMarginWh(forecastHorizonHours: number): number {
    const marginHours = forecastHorizonHours * (1 + SAFETY_FACTOR);
    const minMarginHours = MIN_CONSCIOUSNESS_MARGIN_HOURS;
    const effectiveHours = Math.max(marginHours, minMarginHours);
    return CONSCIOUSNESS_DRAW_WATTS * effectiveHours;
  }

  /**
   * Check whether budget warning thresholds are breached and notify handlers.
   */
  private checkWarnings(): void {
    if (this.warningHandlers.length === 0) return;

    const balance = this.getCurrentBalance();
    const storedWh = balance.stored.wattHours;
    const marginWh = this.getConsciousnessMarginWh(DEFAULT_FORECAST_HORIZON_HOURS);

    // Warn if stored energy is less than WARNING_RATIO × margin
    if (storedWh < marginWh * WARNING_RATIO) {
      for (const handler of this.warningHandlers) {
        handler(balance);
      }
    }
  }
}
