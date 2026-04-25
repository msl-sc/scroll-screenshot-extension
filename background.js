chrome.runtime.onInstalled.addListener(() => {
  console.log('Scroll Screenshot Extension installed!');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (screenshotUrl) => {
      sendResponse(screenshotUrl);
    });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleCapture' });
    }
  });
});