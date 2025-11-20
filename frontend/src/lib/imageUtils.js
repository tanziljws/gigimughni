/**
 * Image utility functions for handling event images
 */

// Get backend base URL from environment or fallback to localhost
const getBackendUrl = () => {
  return import.meta.env.VITE_API_BASE_URL 
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://localhost:3000';
};

// Default placeholder images
const PLACEHOLDERS = {
  event: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
  eventSmall: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
  eventLarge: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop',
};

/**
 * Get event image URL with fallback
 * @param {string} imageUrl - Image URL from database
 * @param {string} size - Size variant: 'small', 'large', or default
 * @returns {string} Image URL with fallback
 */
export const getEventImageUrl = (imageUrl, size = 'default') => {
  if (!imageUrl) {
    return size === 'small' ? PLACEHOLDERS.eventSmall : 
           size === 'large' ? PLACEHOLDERS.eventLarge : 
           PLACEHOLDERS.event;
  }

  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Return local server URL
  // Use backend URL from environment or fallback to localhost
  const backendUrl = import.meta.env.VITE_API_BASE_URL 
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://localhost:3000';
  return `${backendUrl}${imageUrl}`;
};

/**
 * Handle image error silently with fallback
 * @param {Event} e - Error event
 * @param {string} fallbackSize - Fallback size variant
 */
export const handleImageError = (e, fallbackSize = 'default') => {
  // Silently replace with placeholder (no console.error)
  const fallback = fallbackSize === 'small' ? PLACEHOLDERS.eventSmall : 
                   fallbackSize === 'large' ? PLACEHOLDERS.eventLarge : 
                   PLACEHOLDERS.event;
  
  // Only replace if not already a placeholder
  if (!e.target.src.includes('unsplash.com')) {
    e.target.src = fallback;
  }
};

/**
 * Preload image and return promise
 * @param {string} url - Image URL
 * @returns {Promise<boolean>} True if loaded successfully
 */
export const preloadImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * Check if image exists before rendering
 * @param {string} url - Image URL
 * @returns {Promise<string>} URL to use (original or fallback)
 */
export const getValidImageUrl = async (url, fallbackSize = 'default') => {
  if (!url) {
    return fallbackSize === 'small' ? PLACEHOLDERS.eventSmall : 
           fallbackSize === 'large' ? PLACEHOLDERS.eventLarge : 
           PLACEHOLDERS.event;
  }

  const backendUrl = getBackendUrl();
  const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
  const exists = await preloadImage(fullUrl);
  
  if (exists) {
    return fullUrl;
  }

  // Return fallback
  return fallbackSize === 'small' ? PLACEHOLDERS.eventSmall : 
         fallbackSize === 'large' ? PLACEHOLDERS.eventLarge : 
         PLACEHOLDERS.event;
};

// Export backend URL getter for use in other components
export const getBackendBaseUrl = () => getBackendUrl();

export default {
  getEventImageUrl,
  handleImageError,
  preloadImage,
  getValidImageUrl,
  getBackendBaseUrl,
  PLACEHOLDERS
};

