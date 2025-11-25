import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { daysSinceJ2000, julianDateToDate, dateToJulianDate, J2000_EPOCH, MS_PER_DAY } from '../data/ephemeris'

export interface SimulationTimeState {
  /** Current simulation date */
  simulationDate: Ref<Date>
  /** Days since J2000.0 epoch */
  daysSinceEpoch: ComputedRef<number>
  /** Julian date of current simulation time */
  julianDate: ComputedRef<number>
  /** Formatted date string for display */
  formattedDate: ComputedRef<string>
  /** Update simulation time by delta seconds (scaled by simulation speed) */
  advanceTime: (deltaSeconds: number, speedMultiplier: number) => void
  /** Set simulation to a specific date */
  setDate: (date: Date) => void
  /** Reset to current real-world date */
  resetToNow: () => void
  /** Jump to J2000.0 epoch */
  jumpToEpoch: () => void
}

/**
 * Composable for managing simulation time
 * Tracks the "in-simulation" date which can run faster or slower than real time
 * 
 * Time scaling: 1 simulation second = 1 Earth day at speed 1x
 * This means at 1x speed, one real second shows one day of orbital motion
 */
export function useSimulationTime(): SimulationTimeState {
  // Start at current real-world date
  const simulationDate = ref(new Date())
  
  // Days since J2000.0 epoch
  const daysSinceEpoch = computed(() => daysSinceJ2000(simulationDate.value))
  
  // Julian date
  const julianDate = computed(() => dateToJulianDate(simulationDate.value))
  
  // Formatted date for display
  const formattedDate = computed(() => {
    const date = simulationDate.value
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  })
  
  /**
   * Advance simulation time
   * 
   * @param deltaSeconds - Real time elapsed in seconds
   * @param speedMultiplier - Simulation speed (1x, 2x, etc.)
   * 
   * Time scaling: 1 real second = 1 simulation day at 1x speed
   * This provides a good balance for visualizing orbital motion
   */
  function advanceTime(deltaSeconds: number, speedMultiplier: number) {
    // Each real second = 1 day of simulation time at 1x speed
    const simulationDays = deltaSeconds * speedMultiplier
    const newTime = simulationDate.value.getTime() + simulationDays * MS_PER_DAY
    simulationDate.value = new Date(newTime)
  }
  
  /**
   * Set simulation to a specific date
   */
  function setDate(date: Date) {
    simulationDate.value = new Date(date)
  }
  
  /**
   * Reset to current real-world date
   */
  function resetToNow() {
    simulationDate.value = new Date()
  }
  
  /**
   * Jump to J2000.0 epoch (Jan 1, 2000, 12:00 TT)
   */
  function jumpToEpoch() {
    simulationDate.value = julianDateToDate(J2000_EPOCH)
  }
  
  return {
    simulationDate,
    daysSinceEpoch,
    julianDate,
    formattedDate,
    advanceTime,
    setDate,
    resetToNow,
    jumpToEpoch,
  }
}
