import fs from 'fs';
import path from 'path';

const DEFAULTS = {
  TIME_LIMIT_HARD_CUTOFF_SECONDS: 30 * 60,
  TIME_LIMIT_SOFT_WARNING_SECONDS: 25 * 60,
  TIME_LIMIT_MINIMUM_SECONDS: 15 * 60,
};

let configCache: typeof DEFAULTS | null = null;

export function getSharedConfig() {
  if (configCache) return configCache;

  try {
    const configPath = path.resolve(process.cwd(), '../shared_config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      configCache = { ...DEFAULTS, ...JSON.parse(raw) };
    } else {
      console.warn(`Shared config not found at ${configPath}, using defaults.`);
      configCache = DEFAULTS;
    }
  } catch (error) {
    console.error('Failed to load shared config:', error);
    configCache = DEFAULTS;
  }

  return configCache!;
}

export const SHARED_CONFIG = getSharedConfig();
