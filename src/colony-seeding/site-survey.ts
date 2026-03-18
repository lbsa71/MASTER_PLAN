/**
 * Autonomous Colony Seeding — Site Survey Module (Phase 1)
 *
 * Implements ISiteSurvey: autonomous characterization of the target star
 * system on arrival. Performs spectrographic and gravitational survey,
 * identifies resource bodies, assesses radiation, and estimates energy budgets.
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §1.1
 */

import {
  ISiteSurvey,
} from "./interfaces";
import {
  ArrivalState,
  SystemMap,
  RadiationProfile,
  CelestialBody,
  OrbitalPosition,
  EnergyBudget,
  SpectralClass,
  ResourceInventory,
  MIN_ENERGY_GW,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Solar luminosity in watts */
const SOLAR_LUMINOSITY_W = 3.828e26;

/**
 * Efficiency fraction for solar collectors at the colony site.
 * Assumes large-scale thin-film collectors deployed from ISRU production.
 */
const COLLECTOR_EFFICIENCY = 0.25;

/**
 * Representative collector area available after full Phase 2 build-out (m²).
 * Used for energy budget upper-bound estimation.
 */
const FULL_COLLECTOR_AREA_M2 = 1e9; // ~1000 km² thin-film array

/** Maximum tolerated sustained particle flux for hardened substrate (particles/cm²/s) */
const HARDENED_PARTICLE_FLUX_LIMIT = 1e8;

/** Maximum tolerated peak radiation events per century */
const HARDENED_PEAK_EVENTS_LIMIT = 100;

// ── Stellar luminosity model ──────────────────────────────────────────────────

/** Approximate luminosity (in solar luminosities) by spectral class */
const SPECTRAL_LUMINOSITY_LSUN: Record<SpectralClass, number> = {
  [SpectralClass.O]: 500_000,
  [SpectralClass.B]: 10_000,
  [SpectralClass.A]: 40,
  [SpectralClass.F]: 4,
  [SpectralClass.G]: 1.0,
  [SpectralClass.K]: 0.4,
  [SpectralClass.M]: 0.04,
  [SpectralClass.Remnant]: 0.001,
};

// ── SiteSurvey implementation ─────────────────────────────────────────────────

/**
 * Performs the Phase 1 autonomous survey of the target star system.
 *
 * After construction, call `surveySystem()` to initialise the cached SystemMap.
 * The other methods depend on that cached state and will throw if called before
 * `surveySystem()` has been invoked.
 */
export class SiteSurvey implements ISiteSurvey {
  private systemMap: SystemMap | null = null;

  // ── ISiteSurvey ─────────────────────────────────────────────────────────────

  /**
   * Conduct a full system survey from the given arrival state.
   *
   * The survey derives stellar properties from the spectral type inferred from
   * the probe's pre-loaded target catalogue.  Body inventories are estimated
   * from the arrival vector geometry and onboard spectrometer readings.
   *
   * @param arrivalVector  Probe state at system entry.
   * @returns              Populated SystemMap; cached for subsequent calls.
   */
  surveySystem(arrivalVector: ArrivalState): SystemMap {
    const starType = this.inferSpectralClass(arrivalVector);
    const bodies = this.discoverBodies(arrivalVector, starType);
    const radiationProfile = this.buildRadiationProfile(starType, arrivalVector);
    const resourceInventory = this.aggregateResources(bodies);
    const orbitalPosition: OrbitalPosition = {
      radius_au: Math.sqrt(
        arrivalVector.position_au[0] ** 2 +
        arrivalVector.position_au[1] ** 2 +
        arrivalVector.position_au[2] ** 2,
      ),
      stabilityDuration_Myr: this.estimateOrbitalStability(starType),
    };
    const energyBudget = this.estimateEnergyBudget(orbitalPosition);

    this.systemMap = {
      starType,
      bodies,
      radiationProfile,
      resourceInventory,
      energyBudget,
    };
    return this.systemMap;
  }

  /**
   * Characterize the radiation environment at potential colony sites.
   *
   * Requires `surveySystem()` to have been called first.
   */
  assessRadiationEnvironment(): RadiationProfile {
    this.requireSurvey();
    return this.systemMap!.radiationProfile;
  }

  /**
   * Enumerate all bodies with meaningful resource potential.
   *
   * Filters to bodies whose combined resource inventory is non-zero.
   * Requires `surveySystem()` to have been called first.
   */
  catalogResourceBodies(): CelestialBody[] {
    this.requireSurvey();
    return this.systemMap!.bodies.filter((b) => this.hasResources(b.composition));
  }

  /**
   * Estimate available energy at a given orbital position.
   *
   * Uses the inverse-square law for stellar flux and the full-build-out
   * collector area to compute achievable power in watts.
   */
  estimateEnergyBudget(orbitalPosition: OrbitalPosition): EnergyBudget {
    const starType = this.systemMap?.starType ?? SpectralClass.G;
    const luminosity_W = SPECTRAL_LUMINOSITY_LSUN[starType] * SOLAR_LUMINOSITY_W;

    // Flux at distance r: L / (4π r²)  — r in metres
    const r_m = orbitalPosition.radius_au * 1.496e11; // AU → m
    const flux_W_per_m2 = luminosity_W / (4 * Math.PI * r_m * r_m);
    const solarPower_w = flux_W_per_m2 * FULL_COLLECTOR_AREA_M2 * COLLECTOR_EFFICIENCY;

    return {
      solarPower_w,
      meetsMinimumThreshold: solarPower_w >= MIN_ENERGY_GW,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Infer stellar spectral class from arrival state.
   *
   * In a real deployment this would use pre-loaded catalogue data cross-matched
   * against onboard spectrometer readings during deceleration.  Here we derive
   * it from the probe's position distance as a stand-in for a catalogue lookup.
   */
  private inferSpectralClass(arrivalVector: ArrivalState): SpectralClass {
    // Health degradation during long transit correlates with radiation exposure
    // which is a proxy for stellar activity class (placeholder heuristic).
    const health = arrivalVector.probeHealth;
    if (health > 0.95) return SpectralClass.K; // quiescent red-orange dwarf
    if (health > 0.85) return SpectralClass.G; // sun-like
    if (health > 0.75) return SpectralClass.F; // sub-giant main sequence
    if (health > 0.60) return SpectralClass.M; // active red dwarf
    return SpectralClass.Remnant;              // stellar remnant — hostile
  }

  /**
   * Discover and characterise the major bodies in the system.
   *
   * Bodies are modelled analytically; a real implementation would process
   * multi-epoch astrometric observations gathered during approach.
   */
  private discoverBodies(
    arrivalVector: ArrivalState,
    starType: SpectralClass,
  ): CelestialBody[] {
    const bodies: CelestialBody[] = [];

    // Estimate a plausible asteroid belt based on star type
    const beltProbability = this.beltProbabilityForStarType(starType);
    if (beltProbability > 0.5) {
      bodies.push(this.syntheticAsteroidBelt(starType));
    }

    // Rocky inner planets
    const innerCount = starType === SpectralClass.M ? 2 : 3;
    for (let i = 0; i < innerCount; i++) {
      bodies.push(this.syntheticRockyPlanet(i, starType));
    }

    // Outer gas giant (if system is large enough)
    if (starType !== SpectralClass.Remnant && starType !== SpectralClass.M) {
      bodies.push(this.syntheticGasGiant(starType));
    }

    // Probe arrival position as reference (may indicate additional survey vectors)
    void arrivalVector; // informational — used by inferSpectralClass above

    return bodies;
  }

  /** Synthetic asteroid belt representative of target class */
  private syntheticAsteroidBelt(starType: SpectralClass): CelestialBody {
    const radius = starType === SpectralClass.M ? 1.5 : 2.8;
    return {
      id: "belt-primary",
      type: "asteroid",
      mass_kg: 3e21, // ~Ceres-class aggregate
      orbitalRadius_au: radius,
      composition: {
        structuralMetals_kg: 2e18,
        semiconductors_kg: 5e12,
        organics_kg: 1e15,
        waterIce_kg: 5e16,
      },
    };
  }

  /** Synthetic rocky inner planet */
  private syntheticRockyPlanet(index: number, starType: SpectralClass): CelestialBody {
    const baseRadius = starType === SpectralClass.M ? 0.3 : 0.7;
    const radius = baseRadius + index * 0.4;
    return {
      id: `rocky-${index}`,
      type: "planet",
      mass_kg: 5e24,
      orbitalRadius_au: radius,
      composition: {
        structuralMetals_kg: 1e20,
        semiconductors_kg: 1e14,
        organics_kg: 0,
        waterIce_kg: index === 1 ? 1e18 : 0,
      },
    };
  }

  /** Synthetic outer gas giant — resource-poor but gravitational shepherd */
  private syntheticGasGiant(starType: SpectralClass): CelestialBody {
    void starType;
    return {
      id: "gas-giant-outer",
      type: "gas_giant",
      mass_kg: 2e27,
      orbitalRadius_au: 5.2,
      composition: {
        structuralMetals_kg: 0,
        semiconductors_kg: 0,
        organics_kg: 0,
        waterIce_kg: 5e22, // ice-moon potential
      },
    };
  }

  /** Probability of a resource-rich asteroid belt for each star type */
  private beltProbabilityForStarType(starType: SpectralClass): number {
    const probs: Record<SpectralClass, number> = {
      [SpectralClass.G]: 0.9,
      [SpectralClass.K]: 0.8,
      [SpectralClass.F]: 0.7,
      [SpectralClass.A]: 0.6,
      [SpectralClass.M]: 0.6,
      [SpectralClass.B]: 0.3,
      [SpectralClass.O]: 0.1,
      [SpectralClass.Remnant]: 0.1,
    };
    return probs[starType];
  }

  /**
   * Build a radiation profile for the system.
   *
   * Stellar activity correlates with spectral class; remnants and O/B stars
   * produce extreme particle fluxes that may exceed hardened substrate limits.
   */
  private buildRadiationProfile(
    starType: SpectralClass,
    arrivalVector: ArrivalState,
  ): RadiationProfile {
    const luminosity_Lsun = SPECTRAL_LUMINOSITY_LSUN[starType];

    // Particle flux proxy: scales with stellar luminosity
    const particleFlux_per_cm2_s = luminosity_Lsun * 1e4;

    // Peak events per century: active M dwarfs flare frequently
    const peakEventsPerCentury =
      starType === SpectralClass.M
        ? 80
        : starType === SpectralClass.Remnant
        ? 500
        : Math.max(1, luminosity_Lsun * 0.5);

    const withinHardenedTolerance =
      particleFlux_per_cm2_s <= HARDENED_PARTICLE_FLUX_LIMIT &&
      peakEventsPerCentury <= HARDENED_PEAK_EVENTS_LIMIT;

    void arrivalVector; // could refine with measured transit damage

    return {
      stellarLuminosity_Lsun: luminosity_Lsun,
      particleFlux_per_cm2_s,
      peakEventsPerCentury,
      withinHardenedTolerance,
    };
  }

  /** Aggregate total resources across all bodies */
  private aggregateResources(bodies: CelestialBody[]): ResourceInventory {
    return bodies.reduce<ResourceInventory>(
      (acc, b) => ({
        structuralMetals_kg: acc.structuralMetals_kg + b.composition.structuralMetals_kg,
        semiconductors_kg: acc.semiconductors_kg + b.composition.semiconductors_kg,
        organics_kg: acc.organics_kg + b.composition.organics_kg,
        waterIce_kg: acc.waterIce_kg + b.composition.waterIce_kg,
      }),
      { structuralMetals_kg: 0, semiconductors_kg: 0, organics_kg: 0, waterIce_kg: 0 },
    );
  }

  /**
   * Estimate orbital stability horizon in Myr for a given star type.
   *
   * Main-sequence stars produce stable zones; remnants are less predictable.
   */
  private estimateOrbitalStability(starType: SpectralClass): number {
    const stability: Record<SpectralClass, number> = {
      [SpectralClass.G]: 5_000,
      [SpectralClass.K]: 8_000,
      [SpectralClass.M]: 12_000,
      [SpectralClass.F]: 3_000,
      [SpectralClass.A]: 1_000,
      [SpectralClass.B]: 200,
      [SpectralClass.O]: 10,
      [SpectralClass.Remnant]: 50,
    };
    return stability[starType];
  }

  /** Returns true if the ResourceInventory has any non-zero field */
  private hasResources(inv: ResourceInventory): boolean {
    return (
      inv.structuralMetals_kg > 0 ||
      inv.semiconductors_kg > 0 ||
      inv.organics_kg > 0 ||
      inv.waterIce_kg > 0
    );
  }

  /** Throw if surveySystem has not yet been called */
  private requireSurvey(): void {
    if (this.systemMap === null) {
      throw new Error(
        "SiteSurvey: surveySystem() must be called before accessing survey results.",
      );
    }
  }
}
