/**
 * Neural Simulation — Hardware Abstraction Layer (HAL)
 *
 * Re-export boundary for all HAL-specific types defined in types.ts.
 * Per card 0.2.2.1.3 Decision: O3 (Neuromorphic-conventional hybrid with HAL)
 * and Contracts: Hardware Abstraction Layer (HAL) Interface.
 *
 * The HAL interface is identical across all hardware targets
 * (datacenter, radiation-hardened, enduring substrate) — this file
 * provides a stable import surface for HAL consumers.
 */

export type {
  SpikeEvent,
  NodeAllocation,
  StateSnapshot,
  HardwareHealthReport,
  HardwareAbstractionLayer,
} from "./types.js";
