let isCapturing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startScrollCapture') {
    startScrollCapture(request.settings);
  } else if (request.action === 'stopScrollCapture') {
    isCapturing = false;
  }
});

async function startScrollCapture(settings) {
  isCapturing = true;
  const { scrollHeight, delayTime, quality } = settings;
  
  try {
    const screenshots = [];
    const originalScrollTop = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    
    // 计算需要截屏的次数
    const totalScrolls = Math.ceil((pageHeight - originalScrollTop) / scrollHeight);
    let currentScroll = 0;

    // 截屏函数
    const captureScreenshot = async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'captureTab'
        }, (imageData) => {
          resolve(imageData);
        });
      });
    };

    // 开始滚动和截屏
    while (isCapturing && window.scrollY < pageHeight - viewportHeight - 10) {
      // 截屏当前视图
      const canvas = await html2canvas(document.documentElement, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        backgroundColor: '#ffffff'
      });
      
      screenshots.push(canvas);
      currentScroll++;
      
      // 更新进度
      const progress = Math.min(Math.round((currentScroll / totalScrolls) * 100), 100);
      chrome.runtime.sendMessage({
        action: 'updateProgress',
        progress: progress
      });

      // 向下滚动
      window.scrollBy(0, scrollHeight);
      
      // 延迟
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }

    // 最后截一屏
    if (isCapturing) {
      const canvas = await html2canvas(document.documentElement, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        backgroundColor: '#ffffff'
      });
      screenshots.push(canvas);
    }

    // 拼接所有截屏
    if (screenshots.length > 0) {
      const mergedCanvas = mergeCanvases(screenshots);
      const imageData = mergedCanvas.toDataURL('image/png', quality);
      
      // 下载图片
      downloadImage(imageData, 'scroll-screenshot.png');
      
      chrome.runtime.sendMessage({
        action: 'captureComplete'
      });
    }

    // 恢复原始滚动位置
    window.scrollTo(0, originalScrollTop);
    isCapturing = false;

  } catch (error) {
    console.error('截屏错误:', error);
    chrome.runtime.sendMessage({
      action: 'captureError',
      error: error.message
    });
    isCapturing = false;
  }
}

function mergeCanvases(canvases) {
  if (canvases.length === 0) return null;

  const width = canvases[0].width;
  let totalHeight = 0;
  
  canvases.forEach(canvas => {
    totalHeight += canvas.height;
  });

  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = width;
  mergedCanvas.height = totalHeight;
  
  const ctx = mergedCanvas.getContext('2d');
  let currentY = 0;
  
  canvases.forEach(canvas => {
    ctx.drawImage(canvas, 0, currentY);
    currentY += canvas.height;
  });

  return mergedCanvas;
}

function downloadImage(imageData, filename) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}