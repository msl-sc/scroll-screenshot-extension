let currentTabId = null;

document.getElementById('startBtn').addEventListener('click', startCapture);
document.getElementById('stopBtn').addEventListener('click', stopCapture);

// 从存储中恢复设置
chrome.storage.sync.get(['scrollHeight', 'delayTime', 'quality'], (result) => {
  if (result.scrollHeight) document.getElementById('scrollHeight').value = result.scrollHeight;
  if (result.delayTime) document.getElementById('delayTime').value = result.delayTime;
  if (result.quality) document.getElementById('quality').value = result.quality;
});

// 保存设置
['scrollHeight', 'delayTime', 'quality'].forEach(id => {
  document.getElementById(id).addEventListener('change', (e) => {
    chrome.storage.sync.set({ [id]: parseFloat(e.target.value) });
  });
});

async function startCapture() {
  const scrollHeight = parseFloat(document.getElementById('scrollHeight').value);
  const delayTime = parseFloat(document.getElementById('delayTime').value);
  const quality = parseFloat(document.getElementById('quality').value);

  // 验证输入
  if (scrollHeight < 100 || scrollHeight > 2000) {
    showMessage('滚动高度应在 100-2000 px 之间', 'error');
    return;
  }
  if (delayTime < 100 || delayTime > 5000) {
    showMessage('延迟时间应在 100-5000 ms 之间', 'error');
    return;
  }
  if (quality < 0.1 || quality > 1) {
    showMessage('图片质量应在 0.1-1 之间', 'error');
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tabs[0].id;

  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('progress').style.display = 'block';
  showMessage('正在截屏...', 'info');

  // 注入content script并开始截屏
  chrome.tabs.sendMessage(currentTabId, {
    action: 'startScrollCapture',
    settings: { scrollHeight, delayTime, quality }
  });
}

function stopCapture() {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { action: 'stopScrollCapture' });
    resetUI();
    showMessage('已停止截屏', 'info');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateProgress') {
    document.getElementById('progressFill').style.width = request.progress + '%';
    document.getElementById('progressText').textContent = '进度: ' + request.progress + '%';
  } else if (request.action === 'captureComplete') {
    resetUI();
    showMessage('✓ 截屏完成，图片已下载！', 'success');
  } else if (request.action === 'captureError') {
    resetUI();
    showMessage('✗ 错误: ' + request.error, 'error');
  }
});

function resetUI() {
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressText').textContent = '进度: 0%';
  setTimeout(() => {
    document.getElementById('progress').style.display = 'none';
  }, 1000);
}

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  if (type !== 'info') {
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }, 3000);
  }
}