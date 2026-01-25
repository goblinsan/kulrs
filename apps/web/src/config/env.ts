// Environment configuration for the web application
// This file demonstrates how to access Vite environment variables

type AppEnvironment = 'development' | 'staging' | 'production';

interface EnvConfig {
  apiUrl: string;
  appEnv: AppEnvironment;
  enableDebug: boolean;
}

// Valid application environments
const VALID_ENVIRONMENTS: AppEnvironment[] = [
  'development',
  'staging',
  'production',
];

/**
 * Get the current environment configuration
 * All environment variables must be prefixed with VITE_ to be accessible
 */
export function getEnvConfig(): EnvConfig {
  return {
    // API base URL - required
    apiUrl: import.meta.env.VITE_API_URL || 'https://api.kulrs.com',

    // Application environment - required
    appEnv: (import.meta.env.VITE_APP_ENV as AppEnvironment) || 'production',

    // Debug mode - optional, defaults to false
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  };
}

/**
 * Validate that all required environment variables are set
 * Call this early in your application bootstrap
 */
export function validateEnv(): void {
  const config = getEnvConfig();

  if (!config.apiUrl) {
    throw new Error('VITE_API_URL environment variable is required');
  }

  if (!VALID_ENVIRONMENTS.includes(config.appEnv)) {
    console.warn(
      `Invalid VITE_APP_ENV: ${config.appEnv}. Should be one of: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }
}

// Export individual values for convenience
export const { apiUrl, appEnv, enableDebug } = getEnvConfig();
