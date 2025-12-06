/**
 * Exporta todas las configuraciones de ambiente
 */

import { localConfig } from './local';
import { devConfig } from './dev';
import { stagingConfig } from './staging';
import { prodConfig } from './prod';
import { EnvironmentConfig, LocalStackConfig } from './types';

/**
 * Obtiene la configuración según el ambiente especificado
 * @param environment - Nombre del ambiente (local, dev, staging, prod)
 * @returns Configuración del ambiente
 */
export function getConfig(
  environment: string
): EnvironmentConfig | LocalStackConfig {
  switch (environment.toLowerCase()) {
    case 'local':
      return localConfig;
    case 'dev':
    case 'development':
      return devConfig;
    case 'staging':
    case 'stage':
      return stagingConfig;
    case 'prod':
    case 'production':
      return prodConfig;
    default:
      throw new Error(
        `Unknown environment: ${environment}. Valid options: local, dev, staging, prod`
      );
  }
}

/**
 * Obtiene el ambiente desde variables de entorno o usa 'local' por defecto
 */
export function getCurrentEnvironment(): string {
  return process.env.ENVIRONMENT || process.env.NODE_ENV || 'local';
}

// Exportar configs individuales
export { localConfig, devConfig, stagingConfig, prodConfig };
export * from './types';
