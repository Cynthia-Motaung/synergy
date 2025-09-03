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