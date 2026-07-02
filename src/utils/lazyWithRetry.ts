/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that automatically reloads the page
 * if a dynamic import fails (e.g. due to chunk hashing changes after deployment).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      console.error('Failed to import lazy component, retrying by reloading the page:', error);
      
      const pageHasReloadedKey = 'page_has_reloaded_for_chunk_error';
      const hasReloaded = sessionStorage.getItem(pageHasReloadedKey);
      
      if (!hasReloaded) {
        sessionStorage.setItem(pageHasReloadedKey, 'true');
        window.location.reload();
        // Return a promise that never resolves to prevent rendering crash before reload occurs
        return new Promise<{ default: T }>(() => {});
      }
      
      throw error;
    }
  });
}
