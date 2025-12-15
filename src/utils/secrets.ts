/**
 * Secure API key storage using system keyring (keytar)
 */

import keytar from 'keytar';

const SERVICE_NAME = 'codetandem';

/**
 * Store an API key securely in the system keyring
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  const username = `${provider}_api_key`;
  await keytar.setPassword(SERVICE_NAME, username, apiKey);
}

/**
 * Retrieve an API key from the system keyring
 */
export async function getApiKey(provider: string): Promise<string | null> {
  const username = `${provider}_api_key`;
  return await keytar.getPassword(SERVICE_NAME, username);
}

/**
 * Delete an API key from the system keyring
 */
export async function deleteApiKey(provider: string): Promise<boolean> {
  const username = `${provider}_api_key`;
  return await keytar.deletePassword(SERVICE_NAME, username);
}

/**
 * List all stored API keys (returns provider names only)
 */
export async function listApiKeys(): Promise<string[]> {
  const credentials = await keytar.findCredentials(SERVICE_NAME);
  return credentials
    .map((cred) => cred.account.replace('_api_key', ''))
    .filter((provider) => provider.length > 0);
}
