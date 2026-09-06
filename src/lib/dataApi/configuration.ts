import { supabase } from '../supabaseClient'
import type { PortfolioConfig } from '../../types/finance'
import { toHumanError } from './errors'

const DEFAULTS: PortfolioConfig = {
  lease_alert_days: 30,
  insurance_alert_days: 30,
  loan_alert_days: 60,
  anomaly_multiplier: 2,
  minimum_anomaly_amount: 500,
  low_reserve_threshold: 5000,
  default_reporting_period: 'monthly',
}

export interface ConfigResult {
  data: PortfolioConfig | null
  error: string | null
}

/**
 * configuration is a key/value table (config_key, config_value jsonb). Any
 * key missing from the database (should not normally happen — 0008_configuration.sql
 * seeds all of them) falls back to the same default the migration seeds,
 * so a partially-configured database degrades gracefully instead of
 * breaking the whole dashboard.
 */
export async function getPortfolioConfig(): Promise<ConfigResult> {
  if (!supabase) return { data: DEFAULTS, error: null }

  const { data, error } = await supabase.from('configuration').select('config_key, config_value')
  if (error) {
    return { data: DEFAULTS, error: toHumanError(error, 'לא הצלחנו לטעון את הגדרות המערכת — נעשה שימוש בערכי ברירת מחדל') }
  }

  const map: Record<string, unknown> = {}
  for (const row of data ?? []) {
    map[row.config_key as string] = row.config_value
  }

  return {
    data: {
      lease_alert_days: Number(map.lease_alert_days ?? DEFAULTS.lease_alert_days),
      insurance_alert_days: Number(map.insurance_alert_days ?? DEFAULTS.insurance_alert_days),
      loan_alert_days: Number(map.loan_alert_days ?? DEFAULTS.loan_alert_days),
      anomaly_multiplier: Number(map.anomaly_multiplier ?? DEFAULTS.anomaly_multiplier),
      minimum_anomaly_amount: Number(map.minimum_anomaly_amount ?? DEFAULTS.minimum_anomaly_amount),
      low_reserve_threshold: Number(map.low_reserve_threshold ?? DEFAULTS.low_reserve_threshold),
      default_reporting_period: String(map.default_reporting_period ?? DEFAULTS.default_reporting_period),
    },
    error: null,
  }
}
