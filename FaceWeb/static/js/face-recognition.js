/**
 * 现代化人脸识别系统 - 前端核心功能
 * 移植自FaceRecUI
 */

// 全局状态变量
const appState = {
    videoStream: null,
    videoCanvas: null,
    videoContext: null,
    videoInterval: null,
    captureInterval: null,
    isRecognizing: false,
    isPaused: false,
    currentTab: 'recognition',
    processingImage: false,
    currentFaceName: '',
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 初始化标签页切换
    setupTabNavigation();
    
    // 初始化识别页面
    initRecognitionPage();
    
    // 初始化录入页面
    initEnrollmentPage();
    
    // 初始化管理页面
    initManagementPage();
    
    // 为所有视频显示区域添加科技感元素
    const videoDisplays = document.querySelectorAll('.video-display');
    
    videoDisplays.forEach(function(display) {
        // 添加网格线
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        // 添加水平线和垂直线
        for (let i = 1; i <= 3; i++) {
            const hLine = document.createElement('div');
            hLine.className = 'grid-h';
            grid.appendChild(hLine);
        }
        
        for (let i = 4; i <= 6; i++) {
            const vLine = document.createElement('div');
            vLine.className = 'grid-v';
            grid.appendChild(vLine);
        }
        
        // 添加扫描线
        const scannerLine = document.createElement('div');
        scannerLine.className = 'scanner-line';
        
        // 确保已有的tech-corner元素保留
        // 如果没有，则添加它们
        if (!display.querySelector('.tech-corner-tl')) {
            const cornerTL = document.createElement('div');
            cornerTL.className = 'tech-corner tech-corner-tl';
            display.appendChild(cornerTL);
        }
        
        if (!display.querySelector('.tech-corner-tr')) {
            const cornerTR = document.createElement('div');
            cornerTR.className = 'tech-corner tech-corner-tr';
            display.appendChild(cornerTR);
        }
        
        if (!display.querySelector('.tech-corner-bl')) {
            const cornerBL = document.createElement('div');
            cornerBL.className = 'tech-corner tech-corner-bl';
            display.appendChild(cornerBL);
        }
        
        if (!display.querySelector('.tech-corner-br')) {
            const cornerBR = document.createElement('div');
            cornerBR.className = 'tech-corner tech-corner-br';
            display.appendChild(cornerBR);
        }
        
        // 将网格和扫描线添加到显示区域
        display.appendChild(grid);
        display.appendChild(scannerLine);
    });
});

/**
 * 设置标签页导航
 */
function setupTabNavigation() {
    // 获取所有导航链接
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    // 添加点击事件
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 获取目标页面
            const targetTab = link.getAttribute('href').substring(1);
            
            // 如果已经在当前页面，不执行操作
            if (appState.currentTab === targetTab) return;
            
            // 切换页面前的清理工作
            cleanupCurrentTab();
            
            // 切换页面标签
            switchTab(targetTab);
        });
    });
}

/**
 * 清理当前标签页的资源
 */
function cleanupCurrentTab() {
    // 停止所有视频流
    if (appState.videoStream) {
        appState.videoStream.getTracks().forEach(track => track.stop());
        appState.videoStream = null;
    }
    
    // 清除所有定时器
    if (appState.videoInterval) {
        clearInterval(appState.videoInterval);
        appState.videoInterval = null;
    }
    
    if (appState.captureInterval) {
        clearInterval(appState.captureInterval);
        appState.captureInterval = null;
    }
    
    // 重置状态
    appState.isRecognizing = false;
    appState.isPaused = false;
    appState.processingImage = false;
}

/**
 * 切换到指定标签页
 * @param {string} tabName - 标签页名称
 */
function switchTab(tabName) {
    // 更新当前标签
    appState.currentTab = tabName;
    
    // 更新导航链接状态
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        if (link.getAttribute('href') === `#${tabName}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // 更新页面显示
    document.querySelectorAll('.tab-page').forEach(page => {
        if (page.id === tabName) {
            page.style.display = 'block';
        } else {
            page.style.display = 'none';
        }
    });
    
    // 根据页面执行特定初始化
    if (tabName === 'recognition') {
        initRecognitionPage();
    } else if (tabName === 'enrollment') {
        initEnrollmentPage();
    } else if (tabName === 'management') {
        refreshFaceDatabase();
    }
}

/**
 * 初始化识别页面
 */
function initRecognitionPage() {
    // 获取DOM元素
    const videoDisplay = document.getElementById('recognition-display');
    const fileButton = document.getElementById('btn-file');
    const cameraButton = document.getElementById('btn-camera');
    const recognizeButton = document.getElementById('btn-recognize');
    
    // 初始化canvas
    appState.videoCanvas = document.createElement('canvas');
    appState.videoCanvas.width = 640;
    appState.videoCanvas.height = 480;
    appState.videoContext = appState.videoCanvas.getContext('2d');
    
    // 添加按钮事件
    fileButton.addEventListener('click', openImageFile);
    cameraButton.addEventListener('click', toggleCamera);
    recognizeButton.addEventListener('click', recognizeFace);
    
    // 显示初始状态
    showLoadingSpinner(videoDisplay);
    setTimeout(() => {
        videoDisplay.innerHTML = `
            <div class="elegant-tech-container" style="position: relative; height: 100%; width: 100%; overflow: hidden;">
                <!-- 优雅背景效果 -->
                <div class="tech-bg" style="position: absolute; width: 100%; height: 100%; z-index: 0; 
                    background-image: 
                        linear-gradient(rgba(0, 100, 200, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 100, 200, 0.03) 1px, transparent 1px);
                    background-size: 20px 20px;
                    background-position: center;
                    opacity: 0.5;">
                </div>
                
                <!-- 内容中心区域 -->
                <div class="content-center" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    display: flex; flex-direction: column; align-items: center; z-index: 2; width: 90%; max-width: 400px;">
                    
                    <!-- 人脸图标区域 - 保留原风格但增加优雅边框 -->
                    <div class="face-icon-frame" style="position: relative; width: 120px; height: 120px; margin-bottom: 25px;">
                        <!-- 优雅边框 -->
                        <div class="elegant-border" style="position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; 
                            border: 1px solid rgba(0, 180, 255, 0.4); border-radius: 50%; opacity: 0.8;
                            animation: pulseBorder 3s infinite alternate ease-in-out;">
                        </div>
                        
                        <!-- 原始人脸图标，带有圆形背景 -->
                        <div class="face-icon-inner" style="position: relative; width: 100%; height: 100%; 
                            background-color: rgba(0, 20, 40, 0.3); border-radius: 50%; 
                            display: flex; justify-content: center; align-items: center;
                            box-shadow: 0 0 15px rgba(0, 180, 255, 0.2), inset 0 0 20px rgba(0, 180, 255, 0.1);">
                            
                            <!-- 原始人脸图标 -->
                            <img src="/static/images/face.svg" width="70" height="70" style="opacity: 0.9;" alt="Face Icon">
                            
                            <!-- 简约扫描效果 -->
                            <div class="scan-line" style="position: absolute; top: 0; left: 10%; width: 80%; height: 1px; 
                                background: linear-gradient(90deg, transparent, rgba(0, 210, 255, 0.8), transparent); 
                                animation: verticalScan 4s infinite ease-in-out;
                                opacity: 0.7;"></div>
                        </div>
                        
                        <!-- 四角科技感标记 - 简化版 -->
                        <div style="position: absolute; top: -4px; left: -4px; width: 10px; height: 10px; 
                            border-top: 1px solid rgba(0, 210, 255, 0.9); border-left: 1px solid rgba(0, 210, 255, 0.9);"></div>
                        <div style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; 
                            border-top: 1px solid rgba(0, 210, 255, 0.9); border-right: 1px solid rgba(0, 210, 255, 0.9);"></div>
                        <div style="position: absolute; bottom: -4px; left: -4px; width: 10px; height: 10px; 
                            border-bottom: 1px solid rgba(0, 210, 255, 0.9); border-left: 1px solid rgba(0, 210, 255, 0.9);"></div>
                        <div style="position: absolute; bottom: -4px; right: -4px; width: 10px; height: 10px; 
                            border-bottom: 1px solid rgba(0, 210, 255, 0.9); border-right: 1px solid rgba(0, 210, 255, 0.9);"></div>
                    </div>
                    
                    <!-- 标题文本 - 简约优雅版 -->
                    <h3 style="color: rgba(0, 210, 255, 0.9); font-weight: 400; margin: 0 0 20px 0; 
                        text-shadow: 0 0 10px rgba(0, 150, 255, 0.3); letter-spacing: 1px;">
                        智能门卫管理系统
                    </h3>
                    
                    <!-- 简约状态面板 -->
                    <div class="status-panel" style="width: 90%; max-width: 300px; margin-bottom: 20px; 
                        background-color: rgba(0, 15, 35, 0.3); border: 1px solid rgba(0, 180, 255, 0.2); 
                        border-radius: 8px; padding: 12px 15px;">
                        
                        <!-- 状态指示区 -->
                        <div style="display: flex; align-items: center; margin-bottom: 8px; justify-content: center;">
                            <div style="width: 6px; height: 6px; background-color: rgba(0, 255, 150, 0.9); 
                                border-radius: 50%; margin-right: 10px; animation: simplePulse 2s infinite alternate;"></div>
                            <div style="color: rgba(0, 210, 255, 0.9); font-size: 0.85rem;">系统就绪</div>
                        </div>
                        
                        <!-- 简约分割线 -->
                        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 180, 255, 0.2), transparent); 
                            margin: 8px 0;"></div>
                        
                        <!-- 操作提示 -->
                        <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center;">
                            <div style="display: flex; align-items: center; color: rgba(0, 210, 255, 0.8); font-size: 0.85rem;">
                                <span style="margin-right: 8px; opacity: 0.7;">•</span>
                                <span>点击"摄像头"启用实时识别</span>
                            </div>
                            <div style="display: flex; align-items: center; color: rgba(0, 210, 255, 0.8); font-size: 0.85rem;">
                                <span style="margin-right: 8px; opacity: 0.7;">•</span>
                                <span>点击"图片"上传图像进行分析</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 简约悬浮粒子 - 数量减少 -->
                <div class="floating-particles" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></div>
                
                <!-- 简约技术标识 -->
                <div style="position: absolute; bottom: 10px; left: 10px; color: rgba(0, 210, 255, 0.5); 
                    font-size: 0.7rem; letter-spacing: 1px; z-index: 3;">智能门卫管理系统</div>
            </div>
            
            <!-- 简化样式 -->
            <style>
                @keyframes verticalScan {
                    0%, 100% { top: 10%; opacity: 0; }
                    10%, 90% { opacity: 0.7; }
                    50% { top: 90%; opacity: 0.7; }
                }
                
                @keyframes pulseBorder {
                    0% { opacity: 0.4; transform: scale(1); }
                    100% { opacity: 0.7; transform: scale(1.03); }
                }
                
                @keyframes simplePulse {
                    0% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
            </style>
        `;
        
        // 创建少量悬浮粒子
        createSimpleFloatingParticles(videoDisplay.querySelector('.floating-particles'), 8);
        
    }, 800);
}

/**
 * 创建简约悬浮粒子
 * @param {HTMLElement} container - 容器元素
 * @param {Number} count - 粒子数量
 */
function createSimpleFloatingParticles(container, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const size = 1 + Math.random() * 1.5;
        const top = Math.random() * 100;
        const left = Math.random() * 100;
        const duration = 20 + Math.random() * 30;
        const delay = Math.random() * 10;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background-color: rgba(0, 210, 255, ${0.2 + Math.random() * 0.3});
            border-radius: 50%;
            top: ${top}%;
            left: ${left}%;
            box-shadow: 0 0 ${size*2}px rgba(0, 210, 255, 0.3);
            animation: floatSimple ${duration}s infinite ease-in-out;
            animation-delay: -${delay}s;
            opacity: ${0.3 + Math.random() * 0.2};
        `;
        
        container.appendChild(particle);
    }
    
    // 添加简约浮动动画
    if (!document.getElementById('floatSimpleStyle')) {
        const style = document.createElement('style');
        style.id = 'floatSimpleStyle';
        style.textContent = `
            @keyframes floatSimple {
                0%, 100% { transform: translate(0, 0); }
                25% { transform: translate(${Math.random() * 15 - 7}px, ${Math.random() * 15 - 7}px); }
                50% { transform: translate(${Math.random() * 15 - 7}px, ${Math.random() * 15 - 7}px); }
                75% { transform: translate(${Math.random() * 15 - 7}px, ${Math.random() * 15 - 7}px); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * 打开图片文件进行识别
 */
function openImageFile() {
    // 创建隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 添加文件选择事件
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // 显示选择的图片
                const videoDisplay = document.getElementById('recognition-display');
                videoDisplay.innerHTML = '';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                videoDisplay.appendChild(img);
                
                // 停止摄像头
                stopCamera();
            };
            
            reader.readAsDataURL(file);
        }
        
        // 移除文件输入
        document.body.removeChild(fileInput);
    });
    
    // 触发文件选择
    fileInput.click();
}

/**
 * 切换摄像头状态
 */
function toggleCamera() {
    const cameraButton = document.getElementById('btn-camera');
    
    if (appState.videoStream) {
        // 如果摄像头已打开，则关闭
        stopCamera();
        cameraButton.textContent = '摄像头';
    } else {
        // 如果摄像头未打开，则打开
        startCamera();
        cameraButton.textContent = '关闭摄像头';
    }
}

/**
 * 开启摄像头
 */
function startCamera() {
    const videoDisplay = document.getElementById('recognition-display');
    
    // 显示加载动画
    showLoadingSpinner(videoDisplay);
    
    // 创建视频元素
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.autoplay = true;
    
    // 获取摄像头权限
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function(stream) {
            appState.videoStream = stream;
            video.srcObject = stream;
            
            // 清除加载动画并显示视频
            videoDisplay.innerHTML = '';
            videoDisplay.appendChild(video);
            
            // 启动视频帧捕获
            appState.videoInterval = setInterval(() => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    // 将视频帧绘制到Canvas
                    appState.videoContext.drawImage(video, 0, 0, 640, 480);
                }
            }, 100);
        })
        .catch(function(error) {
            console.error('无法访问摄像头:', error);
            videoDisplay.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    摄像头访问失败: ${error.message}
                </div>
            `;
        });
}

/**
 * 停止摄像头
 */
function stopCamera() {
    // 停止视频流
    if (appState.videoStream) {
        appState.videoStream.getTracks().forEach(track => track.stop());
        appState.videoStream = null;
    }
    
    // 清除视频帧捕获
    if (appState.videoInterval) {
        clearInterval(appState.videoInterval);
        appState.videoInterval = null;
    }
}

/**
 * 识别人脸
 */
function recognizeFace() {
    if (appState.processingImage) return;
    appState.processingImage = true;
    
    const videoDisplay = document.getElementById('recognition-display');
    const resultElement = document.getElementById('recognition-result');
    
    // 获取当前图像
    let imageData;
    
    if (appState.videoStream) {
        // 从摄像头获取图像
        imageData = appState.videoCanvas.toDataURL('image/jpeg');
    } else {
        // 从显示的图像获取
        const img = videoDisplay.querySelector('img');
        if (!img) {
            resultElement.textContent = '没有可用的图像';
            appState.processingImage = false;
            return;
        }
        
        // 将图像绘制到Canvas
        appState.videoContext.clearRect(0, 0, 640, 480);
        appState.videoContext.drawImage(img, 0, 0, 640, 480);
        imageData = appState.videoCanvas.toDataURL('image/jpeg');
    }
    
    // 发送识别请求
    fetch('/api/recognize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageData })
    })
    .then(response => response.json())
    .then(data => {
        // 恢复原始图像
        if (appState.videoStream) {
            // 显示视频流
            const video = document.createElement('video');
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.autoplay = true;
            video.srcObject = appState.videoStream;
            
            videoDisplay.innerHTML = '';
            videoDisplay.appendChild(video);
        } else {
            // 显示原始图像
            videoDisplay.innerHTML = '';
            const img = document.createElement('img');
            img.src = imageData;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            videoDisplay.appendChild(img);
        }
        
        // 显示识别结果
        if (data.faces && data.faces.length > 0) {
            // 显示人脸框
            showFaceRects(videoDisplay, data.faces);
            
            // 更新结果文本
            let resultText = '';
            data.faces.forEach((face, index) => {
                const confidence = Math.round((1 - face.distance) * 100);
                resultText += `人脸${index + 1}: ${face.name} (${confidence}%)\n`;
            });
            
            resultElement.textContent = resultText;
        } else {
            resultElement.textContent = '未检测到人脸';
        }
        
        appState.processingImage = false;
    })
    .catch(error => {
        console.error('识别请求失败:', error);
        resultElement.textContent = '识别请求失败';
        appState.processingImage = false;
    });
}

/**
 * 初始化录入页面
 */
function initEnrollmentPage() {
    // 获取DOM元素
    const enrollNameInput = document.getElementById('enroll-name');
    const createFolderButton = document.getElementById('btn-create-folder');
    const fileButton = document.getElementById('btn-enroll-file');
    const cameraButton = document.getElementById('btn-enroll-camera');
    const captureButton = document.getElementById('btn-capture');
    const saveButton = document.getElementById('btn-save-face');
    const previewElement = document.getElementById('face-preview');
    const enrollDisplay = document.getElementById('enrollment-display');
    
    // 禁用一些按钮，直到创建文件夹
    fileButton.disabled = true;
    cameraButton.disabled = true;
    captureButton.disabled = true;
    saveButton.disabled = true;
    
    // 添加按钮事件
    createFolderButton.addEventListener('click', createFaceFolder);
    fileButton.addEventListener('click', selectFaceImage);
    cameraButton.addEventListener('click', toggleEnrollCamera);
    captureButton.addEventListener('click', captureFaceImage);
    saveButton.addEventListener('click', saveFaceToDatabase);
    
    // 显示初始状态 - 优雅简约风格
    enrollDisplay.innerHTML = `
        <div class="elegant-enrollment-container" style="position: relative; height: 100%; width: 100%; overflow: hidden;">
            <!-- 优雅背景 -->
            <div class="tech-bg" style="position: absolute; width: 100%; height: 100%; z-index: 0; 
                background-image: 
                    linear-gradient(rgba(0, 100, 200, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 100, 200, 0.03) 1px, transparent 1px);
                background-size: 20px 20px;
                background-position: center;
                opacity: 0.5;">
            </div>
            
            <!-- 主要内容 -->
            <div class="content-center" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                display: flex; flex-direction: column; align-items: center; z-index: 2; width: 90%; max-width: 400px;">
                
                <!-- 人脸录入图标区域 -->
                <div class="face-enroll-frame" style="position: relative; width: 120px; height: 120px; margin-bottom: 25px;">
                    <!-- 优雅边框 -->
                    <div class="elegant-border" style="position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; 
                        border: 1px solid rgba(0, 180, 255, 0.4); border-radius: 50%; opacity: 0.8;
                        animation: pulseBorder 3s infinite alternate ease-in-out;">
                    </div>
                    
                    <!-- 人脸录入图标内容 -->
                    <div class="face-icon-inner" style="position: relative; width: 100%; height: 100%; 
                        background-color: rgba(0, 20, 40, 0.3); border-radius: 50%; 
                        display: flex; justify-content: center; align-items: center;
                        box-shadow: 0 0 15px rgba(0, 180, 255, 0.2), inset 0 0 20px rgba(0, 180, 255, 0.1);">
                        
                        <!-- 使用原始面部图标 -->
                        <img src="/static/images/face.svg" width="65" height="65" style="opacity: 0.9;" alt="Face Icon">
                        
                        <!-- 添加录入加号标识 -->
                        <div style="position: absolute; top: 10px; right: 10px; width: 20px; height: 20px;
                            display: flex; justify-content: center; align-items: center;
                            background-color: rgba(0, 40, 80, 0.7); border-radius: 50%;
                            box-shadow: 0 0 5px rgba(0, 180, 255, 0.5);">
                            <span style="color: rgba(0, 255, 150, 0.9); font-size: 16px; line-height: 1; font-weight: bold;">+</span>
                        </div>
                        
                        <!-- 优雅扫描线 -->
                        <div class="scan-line" style="position: absolute; top: 0; left: 10%; width: 80%; height: 1px; 
                            background: linear-gradient(90deg, transparent, rgba(0, 210, 255, 0.8), transparent); 
                            animation: verticalScan 4s infinite ease-in-out;
                            opacity: 0.7;"></div>
                    </div>
                    
                    <!-- 四角科技感标记 - 简化版 -->
                    <div style="position: absolute; top: -4px; left: -4px; width: 10px; height: 10px; 
                        border-top: 1px solid rgba(0, 210, 255, 0.9); border-left: 1px solid rgba(0, 210, 255, 0.9);"></div>
                    <div style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; 
                        border-top: 1px solid rgba(0, 210, 255, 0.9); border-right: 1px solid rgba(0, 210, 255, 0.9);"></div>
                    <div style="position: absolute; bottom: -4px; left: -4px; width: 10px; height: 10px; 
                        border-bottom: 1px solid rgba(0, 210, 255, 0.9); border-left: 1px solid rgba(0, 210, 255, 0.9);"></div>
                    <div style="position: absolute; bottom: -4px; right: -4px; width: 10px; height: 10px; 
                        border-bottom: 1px solid rgba(0, 210, 255, 0.9); border-right: 1px solid rgba(0, 210, 255, 0.9);"></div>
                </div>
                
                <!-- 标题文本 - 简约优雅版 -->
                <h3 style="color: rgba(0, 210, 255, 0.9); font-weight: 400; margin: 0 0 20px 0; 
                    text-shadow: 0 0 10px rgba(0, 150, 255, 0.3); letter-spacing: 1px;">
                    人员录入
                </h3>
                
                <!-- 简约状态面板 -->
                <div class="status-panel" style="width: 90%; max-width: 300px; 
                    background-color: rgba(0, 15, 35, 0.3); border: 1px solid rgba(0, 180, 255, 0.2); 
                    border-radius: 8px; padding: 12px 15px; text-align: center;">
                    
                    <!-- 状态指示区 -->
                    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                        <div style="width: 6px; height: 6px; background-color: rgba(255, 180, 0, 0.9); 
                            border-radius: 50%; margin-right: 10px; animation: simplePulse 2s infinite alternate;"></div>
                        <div style="color: rgba(0, 210, 255, 0.9); font-size: 0.85rem;">等待初始化</div>
                    </div>
                    
                    <!-- 操作提示 -->
                    <p style="color: rgba(0, 210, 255, 0.8); margin: 5px 0; font-size: 0.85rem;">
                        请先输入人脸名称并创建文件夹
                    </p>
                </div>
            </div>
            
            <!-- 简约悬浮粒子 -->
            <div class="floating-particles" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></div>
            
            <!-- 简约技术标识 -->
            <div style="position: absolute; bottom: 10px; left: 10px; color: rgba(0, 210, 255, 0.5); 
                font-size: 0.7rem; letter-spacing: 1px; z-index: 3;">智能门卫管理系统</div>
        </div>
    `;
    
    // 创建少量悬浮粒子
    createSimpleFloatingParticles(enrollDisplay.querySelector('.floating-particles'), 8);
}

/**
 * 创建人脸文件夹
 */
function createFaceFolder() {
    const enrollNameInput = document.getElementById('enroll-name');
    const faceName = enrollNameInput.value.trim();
    const statusElement = document.getElementById('enrollment-status');
    
    if (!faceName) {
        statusElement.innerHTML = '<div class="alert alert-warning">请输入人脸名称</div>';
        return;
    }
    
    // 发送创建文件夹请求
    fetch('/api/create_face', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ face_name: faceName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新状态
            statusElement.innerHTML = `<div class="alert alert-success">已创建人脸文件夹: ${faceName}</div>`;
            
            // 保存当前人脸名称
            appState.currentFaceName = faceName;
            
            // 启用相关按钮
            document.getElementById('btn-enroll-file').disabled = false;
            document.getElementById('btn-enroll-camera').disabled = false;
        } else {
            statusElement.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
        }
    })
    .catch(error => {
        console.error('创建文件夹请求失败:', error);
        statusElement.innerHTML = '<div class="alert alert-danger">创建文件夹请求失败</div>';
    });
}

/**
 * 选择人脸图像文件
 */
function selectFaceImage() {
    if (!appState.currentFaceName) {
        document.getElementById('enrollment-status').innerHTML = '<div class="alert alert-warning">请先创建人脸文件夹</div>';
        return;
    }
    
    // 创建隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 添加文件选择事件
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // 显示选择的图片
                const enrollDisplay = document.getElementById('enrollment-display');
                enrollDisplay.innerHTML = '';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                enrollDisplay.appendChild(img);
                
                // 启用捕获按钮
                document.getElementById('btn-capture').disabled = false;
                
                // 停止摄像头
                if (appState.videoStream) {
                    appState.videoStream.getTracks().forEach(track => track.stop());
                    appState.videoStream = null;
                }
            };
            
            reader.readAsDataURL(file);
        }
        
        // 移除文件输入
        document.body.removeChild(fileInput);
    });
    
    // 触发文件选择
    fileInput.click();
}

/**
 * 切换录入摄像头状态
 */
function toggleEnrollCamera() {
    if (!appState.currentFaceName) {
        document.getElementById('enrollment-status').innerHTML = '<div class="alert alert-warning">请先创建人脸文件夹</div>';
        return;
    }
    
    const cameraButton = document.getElementById('btn-enroll-camera');
    
    if (appState.videoStream) {
        // 如果摄像头已打开，则关闭
        if (appState.videoStream) {
            appState.videoStream.getTracks().forEach(track => track.stop());
            appState.videoStream = null;
        }
        cameraButton.textContent = '摄像头';
        document.getElementById('btn-capture').disabled = true;
    } else {
        // 如果摄像头未打开，则打开
        const enrollDisplay = document.getElementById('enrollment-display');
        
        // 显示加载动画
        showLoadingSpinner(enrollDisplay);
        
        // 创建视频元素
        const video = document.createElement('video');
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.autoplay = true;
        
        // 获取摄像头权限
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(function(stream) {
                appState.videoStream = stream;
                video.srcObject = stream;
                
                // 清除加载动画并显示视频
                enrollDisplay.innerHTML = '';
                enrollDisplay.appendChild(video);
                
                // 启用捕获按钮
                document.getElementById('btn-capture').disabled = false;
                
                // 更新按钮文本
                cameraButton.textContent = '关闭摄像头';
            })
            .catch(function(error) {
                console.error('无法访问摄像头:', error);
                enrollDisplay.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i>
                        摄像头访问失败: ${error.message}
                    </div>
                `;
            });
    }
}

/**
 * 捕获人脸图像
 */
function captureFaceImage() {
    if (!appState.currentFaceName) {
        document.getElementById('enrollment-status').innerHTML = '<div class="alert alert-warning">请先创建人脸文件夹</div>';
        return;
    }
    
    const enrollDisplay = document.getElementById('enrollment-display');
    const previewElement = document.getElementById('face-preview');
    
    // 初始化canvas
    if (!appState.videoCanvas) {
        appState.videoCanvas = document.createElement('canvas');
        appState.videoCanvas.width = 640;
        appState.videoCanvas.height = 480;
        appState.videoContext = appState.videoCanvas.getContext('2d');
    }
    
    // 捕获图像
    if (appState.videoStream) {
        // 从视频捕获
        const video = enrollDisplay.querySelector('video');
        if (video) {
            appState.videoContext.drawImage(video, 0, 0, 640, 480);
        }
    } else {
        // 从图像捕获
        const img = enrollDisplay.querySelector('img');
        if (img) {
            appState.videoContext.drawImage(img, 0, 0, 640, 480);
        } else {
            document.getElementById('enrollment-status').innerHTML = '<div class="alert alert-warning">没有可用的图像</div>';
            return;
        }
    }
    
    // 获取图像数据
    const imageData = appState.videoCanvas.toDataURL('image/jpeg');
    
    // 显示预览
    previewElement.innerHTML = '';
    const previewImg = document.createElement('img');
    previewImg.src = imageData;
    previewImg.style.width = '100%';
    previewImg.style.height = '100%';
    previewImg.style.objectFit = 'cover';
    previewElement.appendChild(previewImg);
    
    // 启用保存按钮
    document.getElementById('btn-save-face').disabled = false;
}

/**
 * 保存人脸到数据库
 */
function saveFaceToDatabase() {
    if (!appState.currentFaceName) {
        document.getElementById('enrollment-status').innerHTML = '<div class="alert alert-warning">请先创建人脸文件夹</div>';
        return;
    }
    
    const previewElement = document.getElementById('face-preview');
    const previewImg = previewElement.querySelector('img');
    const statusElement = document.getElementById('enrollment-status');
    
    if (!previewImg) {
        statusElement.innerHTML = '<div class="alert alert-warning">请先捕获人脸图像</div>';
        return;
    }
    
    // 获取图像数据
    const imageData = previewImg.src;
    
    // 显示加载状态
    statusElement.innerHTML = '<div class="alert alert-info">正在保存人脸...</div>';
    
    // 发送保存请求
    fetch('/api/add_face_from_camera', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            face_name: appState.currentFaceName,
            image_data: imageData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新状态
            statusElement.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            
            // 清除预览
            previewElement.innerHTML = '';
            
            // 禁用保存按钮
            document.getElementById('btn-save-face').disabled = true;
        } else {
            statusElement.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
        }
    })
    .catch(error => {
        console.error('保存人脸请求失败:', error);
        statusElement.innerHTML = '<div class="alert alert-danger">保存人脸请求失败</div>';
    });
}

/**
 * 初始化管理页面
 */
function initManagementPage() {
    // 获取DOM元素
    const refreshButton = document.getElementById('btn-refresh-database');
    
    // 添加按钮事件
    refreshButton.addEventListener('click', refreshFaceDatabase);
    
    // 刷新人脸数据库
    refreshFaceDatabase();
}

/**
 * 刷新人脸数据库
 */
function refreshFaceDatabase() {
    const tableBody = document.getElementById('face-table-body');
    const statusElement = document.getElementById('management-status');
    const infoElement = document.getElementById('face-database-info');
    
    // 显示加载状态
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">加载中...</td></tr>';
    infoElement.textContent = '加载中...';
    
    // 发送请求
    fetch('/api/get_face_database')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新表格
                tableBody.innerHTML = '';
                
                if (data.faces.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">数据库中没有人脸</td></tr>';
                } else {
                    data.faces.forEach((face, index) => {
                        const row = document.createElement('tr');
                        
                        // 序号列
                        const indexCell = document.createElement('td');
                        indexCell.textContent = index + 1;
                        row.appendChild(indexCell);
                        
                        // 人脸名称列
                        const nameCell = document.createElement('td');
                        nameCell.textContent = face.name;
                        row.appendChild(nameCell);
                        
                        // 图像数量列
                        const countCell = document.createElement('td');
                        countCell.textContent = face.image_count;
                        row.appendChild(countCell);
                        
                        // 操作列
                        const actionCell = document.createElement('td');
                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'btn btn-danger btn-sm';
                        deleteButton.textContent = '删除';
                        deleteButton.addEventListener('click', () => deleteFace(face.name));
                        actionCell.appendChild(deleteButton);
                        row.appendChild(actionCell);
                        
                        tableBody.appendChild(row);
                    });
                }
                
                // 更新信息
                infoElement.textContent = `共有 ${data.total_faces} 个人脸，${data.total_images} 张图像`;
                
                // 清除状态消息
                statusElement.innerHTML = '';
            } else {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">加载失败</td></tr>';
                infoElement.textContent = '加载失败';
                statusElement.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        })
        .catch(error => {
            console.error('获取人脸数据库失败:', error);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">加载失败</td></tr>';
            infoElement.textContent = '加载失败';
            statusElement.innerHTML = '<div class="alert alert-danger">获取人脸数据库失败</div>';
        });
}

/**
 * 删除人脸
 * @param {string} faceName - 要删除的人脸名称
 */
function deleteFace(faceName) {
    if (!confirm(`确定要删除 ${faceName} 吗？此操作不可撤销。`)) {
        return;
    }
    
    const statusElement = document.getElementById('management-status');
    
    // 显示加载状态
    statusElement.innerHTML = '<div class="alert alert-info">正在删除...</div>';
    
    // 发送删除请求
    fetch('/api/delete_face', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ face_name: faceName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新状态
            statusElement.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            
            // 刷新数据库
            refreshFaceDatabase();
        } else {
            statusElement.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
        }
    })
    .catch(error => {
        console.error('删除人脸请求失败:', error);
        statusElement.innerHTML = '<div class="alert alert-danger">删除人脸请求失败</div>';
    });
} 