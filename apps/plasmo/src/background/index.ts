/**
 * Background script for the Wish CDP browser extension.
 * 
 * Handles extension action clicks, context menu items, and other
 * background tasks for wishlist management.
 */

export {};

/**
 * Handle extension icon click.
 * 
 * Opens the options page when the extension icon is clicked.
 * This provides access to the main extension interface.
 */
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked', { tabId: tab.id, url: tab.url });
  
  // Open the extension options page
  chrome.runtime.openOptionsPage((error) => {
    if (error) {
      console.error('Failed to open options page:', error);
    } else {
      console.log('Options page opened successfully');
    }
  });
});

/**
 * Log extension startup.
 */
console.log('Wish CDP extension background script loaded');

/**
 * Handle extension installation/update.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated', details);
  
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    // Could show welcome page or setup instructions
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

/**
 * Handle messages from content scripts or popup.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);
  
  // Handle different message types
  switch (message.type) {
    case 'HEALTH_CHECK':
      sendResponse({ status: 'ok', timestamp: Date.now() });
      break;
      
    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
  
  // Return true to indicate async response
  return true;
});
