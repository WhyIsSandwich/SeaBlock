import { ref } from 'vue'
import { withBase } from 'vitepress'

import { resolveDataUrl } from '../../../src/components/assetResolver.js'

// Shared state for localized data
const localizedData = ref(null)
const isLoading = ref(false)
const error = ref(null)

// Cache to prevent multiple fetches
let fetchPromise = null

export function useLocalizedData() {
  const loadLocalizedData = () => {
    // If data is already loaded, return it
    if (localizedData.value) {
      return localizedData.value
    }

    // If already loading, return the existing promise
    if (fetchPromise) {
      return fetchPromise
    }

    // Start loading
    isLoading.value = true
    error.value = null

    fetchPromise = fetch(resolveDataUrl('locale-en.json', withBase))
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch localized data: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        localizedData.value = data
        return data
      })
      .catch(err => {
        error.value = err
        console.error('Failed to load localized data:', err)
        throw err
      })
      .finally(() => {
        isLoading.value = false
        fetchPromise = null
      })

    return fetchPromise
  }

  return {
    localizedData,
    isLoading,
    error,
    loadLocalizedData
  }
}
