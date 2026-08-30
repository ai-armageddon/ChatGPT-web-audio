/* Background service worker.
 * Fires on fresh install and on extension updates: ask the user to pick a
 * player style on their next ChatGPT visit. Their current choice is
 * pre-selected in the picker, so confirming is one click.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ onboardingPending: true });
});
