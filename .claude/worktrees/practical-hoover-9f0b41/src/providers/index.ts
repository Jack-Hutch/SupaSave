import type { BankProvider } from '../types';
import type { BankProviderInstance } from './bankProvider';
import { MockProvider } from './mockProvider';
import { UpProvider } from './upProvider';

export type { BankProviderInstance };

const providerCache = new Map<string, BankProviderInstance>();

export function getProvider(
  providerType: BankProvider,
  userId: string
): BankProviderInstance {
  const cacheKey = `${providerType}-${userId}`;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let instance: BankProviderInstance;

  switch (providerType) {
    case 'up':
      instance = new UpProvider(userId);
      break;
    case 'mock':
      instance = new MockProvider();
      break;
    case 'plaid':
      throw new Error('Plaid provider is not yet implemented.');
    case 'truelayer':
      throw new Error('TrueLayer provider is not yet implemented.');
    default:
      throw new Error(`Unknown bank provider: ${providerType}`);
  }

  providerCache.set(cacheKey, instance);
  return instance;
}

export function clearProviderCache(): void {
  providerCache.clear();
}

export { MockProvider, UpProvider };
