// Background service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Synergy Pomodoro Timer extension installed');
});

// Handle notifications
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'pomodoroComplete') {
    // Focus on the extension popup if possible
    chrome.action.openPopup();
  }
});

// Handle extension icon click (optional - if you want additional functionality)
chrome.action.onClicked.addListener((tab) => {
  // You could add functionality here to open a full-page version
  // or perform other actions when the icon is clicked
  console.log('Extension icon clicked');
});