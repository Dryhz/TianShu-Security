/**
 * 现代化人脸识别系统 - 高级功能模块
 * 提供实时识别、数据分析、深度统计等功能
 */

// 全局配置
const advancedConfig = {
    // 实时识别配置
    realtime: {
        enabled: false,
        interval: 500,  // 识别间隔(毫秒)
        minConfidence: 0.65,  // 最小可信度
        maxHistory: 10  // 历史记录最大数量
    },
    
    // 分析配置
    analytics: {
        enabled: false,
        collectData: true,
        saveStats: true
    },
    
    // 性能配置
    performance: {
        highPerformanceMode: false,
        lowPowerMode: false
    }
};

// 历史记录数据
const recognitionHistory = [];

// 实时统计数据
const realTimeStats = {
    totalFaces: 0,
    recognizedFaces: 0,
    unknownFaces: 0,
    averageConfidence: 0,
    processingTimes: []
};

/**
 * 初始化高级功能
 */
function initAdvancedFeatures() {
    // 检查是否在识别页面
    if (document.getElementById('recognition-display')) {
        setupRealTimeRecognition();
        setupAnalytics();
        setupPerformanceControls();
    }
    
    // 不再添加右下角的高级功能按钮
    // addAdvancedControls();
}

/**
 * 设置实时识别功能
 */
function setupRealTimeRecognition() {
    // 创建实时识别开关
    const controlPanel = document.createElement('div');
    controlPanel.className = 'advanced-controls mb-3';
    controlPanel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="realtime-toggle">
                <label class="form-check-label" for="realtime-toggle">实时识别</label>
            </div>
        </div>
    `;
    
    // 查找插入位置
    const container = document.querySelector('.card-body');
    if (container) {
        container.insertBefore(controlPanel, container.firstChild);
    }
    
    // 添加事件监听器
    document.getElementById('realtime-toggle').addEventListener('change', function(e) {
        advancedConfig.realtime.enabled = e.target.checked;
        if (advancedConfig.realtime.enabled) {
            startRealtimeRecognition();
        } else {
            stopRealtimeRecognition();
        }
    });
}

/**
 * 启动实时识别
 */
function startRealtimeRecognition() {
    if (!appState.videoStream) {
        // 如果摄像头未开启，自动开启
        startCamera();
        
        // 等待摄像头开启后再启动实时识别
        setTimeout(() => {
            if (appState.videoStream) {
                startRealtimeInterval();
            } else {
                advancedConfig.realtime.enabled = false;
                document.getElementById('realtime-toggle').checked = false;
                showNotification('无法开启摄像头，实时识别已禁用', 'warning');
            }
        }, 1000);
    } else {
        startRealtimeInterval();
    }
}

/**
 * 启动实时识别间隔器
 */
function startRealtimeInterval() {
    // 清除现有的间隔器
    if (appState.captureInterval) {
        clearInterval(appState.captureInterval);
    }
    
    // 设置新的间隔器
    appState.captureInterval = setInterval(() => {
        if (appState.processingImage || !appState.videoStream) {
            return;  // 如果正在处理或摄像头未开启，跳过此帧
        }
        
        performRealtimeRecognition();
    }, advancedConfig.realtime.interval);
    
    // 显示通知
    showNotification('实时识别已启动', 'success');
}

/**
 * 执行实时识别
 */
function performRealtimeRecognition() {
    if (!appState.videoStream || appState.processingImage) return;
    
    appState.processingImage = true;
    
    // 从Canvas获取图像数据
    const imageData = appState.videoCanvas.toDataURL('image/jpeg');
    
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
        if (data.success) {
            // 更新显示
            const videoDisplay = document.getElementById('recognition-display');
            const resultElement = document.getElementById('recognition-result');
            
            // 显示人脸框
            if (data.faces && data.faces.length > 0) {
                showFaceRects(videoDisplay, data.faces);
                
                // 更新结果文本
                let resultText = '';
                data.faces.forEach((face, index) => {
                    const confidence = Math.round((1 - face.distance) * 100);
                    resultText += `人脸${index + 1}: ${face.name} (${confidence}%)\n`;
                });
                
                // 动画更新结果文本
                animateTextChange(resultElement, resultText);
                
                // 更新统计信息
                updateRealtimeStats(data);
            }
            
            // 更新FPS和其他性能指标
            if (data.performance) {
                updatePerformanceMetrics(data.performance);
            }
            
            // 添加到历史记录
            addToRecognitionHistory(data);
        }
        
        appState.processingImage = false;
    })
    .catch(error => {
        console.error('实时识别错误:', error);
        appState.processingImage = false;
    });
}

/**
 * 停止实时识别
 */
function stopRealtimeRecognition() {
    if (appState.captureInterval) {
        clearInterval(appState.captureInterval);
        appState.captureInterval = null;
        
        // 显示通知
        showNotification('实时识别已停止', 'info');
    }
}

/**
 * 更新实时统计信息
 * @param {Object} data - 识别结果数据
 */
function updateRealtimeStats(data) {
    if (!data.faces) return;
    
    // 更新总人脸数
    realTimeStats.totalFaces += data.faces.length;
    
    // 计算已识别和未识别的人脸
    const recognized = data.faces.filter(face => face.name !== 'unknown').length;
    const unknown = data.faces.length - recognized;
    
    realTimeStats.recognizedFaces += recognized;
    realTimeStats.unknownFaces += unknown;
    
    // 计算平均可信度
    const confidences = data.faces.map(face => 1 - face.distance);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length || 0;
    
    // 使用滑动窗口计算平均可信度
    realTimeStats.averageConfidence = (realTimeStats.averageConfidence * 0.7) + (avgConfidence * 0.3);
    
    // 如果有性能数据，记录处理时间
    if (data.performance && data.performance.detection_time) {
        realTimeStats.processingTimes.push(data.performance.detection_time);
        
        // 保持数组大小在可控范围内
        if (realTimeStats.processingTimes.length > 50) {
            realTimeStats.processingTimes.shift();
        }
    }
    
    // 更新UI显示
    document.getElementById('face-count').textContent = data.faces.length;
    document.getElementById('similarity').textContent = 
        Math.round(realTimeStats.averageConfidence * 100) + '%';
    
    // 如果有性能数据，更新处理时间
    if (data.performance) {
        document.getElementById('time-cost').textContent = 
            data.performance.detection_time + 'ms';
    }
    
    // 计算FPS
    const avgTime = realTimeStats.processingTimes.reduce((sum, time) => sum + time, 0) / 
                   realTimeStats.processingTimes.length || 0;
    const fps = Math.round(1000 / (avgTime || advancedConfig.realtime.interval));
    document.getElementById('fps-value').textContent = fps;
}

/**
 * 添加到识别历史记录
 * @param {Object} data - 识别结果数据
 */
function addToRecognitionHistory(data) {
    if (!advancedConfig.analytics.collectData || !data.faces || data.faces.length === 0) {
        return;
    }
    
    // 创建历史记录条目
    const historyEntry = {
        timestamp: new Date(),
        faces: data.faces.map(face => ({
            name: face.name,
            confidence: 1 - face.distance
        })),
        performance: data.performance || {}
    };
    
    // 添加到历史记录
    recognitionHistory.unshift(historyEntry);
    
    // 限制历史记录大小
    if (recognitionHistory.length > advancedConfig.realtime.maxHistory) {
        recognitionHistory.pop();
    }
}

/**
 * 设置分析功能
 */
function setupAnalytics() {
    // 创建分析面板
    const analyticsSection = document.createElement('div');
    analyticsSection.className = 'analytics-section mt-4 d-none';
    analyticsSection.id = 'analytics-panel';
    analyticsSection.innerHTML = `
        <h5 class="section-title">高级设置</h5>
        <div class="row mb-2">
            <div class="col-md-6">
                <div class="d-flex align-items-center">
                    <i class="fas fa-chart-line me-2" style="color: #00ccff;"></i>
                    <span>识别率:</span>
                    <span id="recognition-rate" class="ms-auto result-display">0%</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="d-flex align-items-center">
                    <i class="fas fa-stopwatch me-2" style="color: #00ccff;"></i>
                    <span>平均时间:</span>
                    <span id="avg-time" class="ms-auto result-display">0ms</span>
                </div>
            </div>
        </div>
        <div id="recognition-chart" style="height: 150px; background-color: rgba(0, 0, 0, 0.3); border-radius: 8px;"></div>
        
        <h5 class="section-title mt-4">参数设置</h5>
        <div class="mb-3">
            <label class="form-label">最小可信度阈值</label>
            <div class="d-flex align-items-center">
                <input type="range" class="form-range me-2" id="confidence-slider" min="0" max="100" step="5" value="${advancedConfig.realtime.minConfidence * 100}">
                <span id="confidence-value">${Math.round(advancedConfig.realtime.minConfidence * 100)}%</span>
            </div>
            <small class="text-muted">低于此阈值的匹配将显示为"未知"</small>
        </div>
        
        <div class="mb-3">
            <label class="form-label">历史记录数量</label>
            <div class="d-flex align-items-center">
                <input type="range" class="form-range me-2" id="history-slider" min="5" max="50" step="5" value="${advancedConfig.realtime.maxHistory}">
                <span id="history-value">${advancedConfig.realtime.maxHistory}</span>
            </div>
        </div>
        
        <div class="mb-3">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="collect-data-toggle" ${advancedConfig.analytics.collectData ? 'checked' : ''}>
                <label class="form-check-label" for="collect-data-toggle">收集分析数据</label>
            </div>
            <small class="text-muted">收集识别结果用于统计分析</small>
        </div>
        
        <div class="d-flex justify-content-end">
            <button id="save-settings-btn" class="btn btn-primary btn-sm">
                <i class="fas fa-save me-1"></i> 保存设置
            </button>
        </div>
    `;
    
    // 查找插入位置
    const infoPanel = document.querySelector('.info-panel');
    if (infoPanel) {
        infoPanel.appendChild(analyticsSection);
        
        // 添加设置保存按钮事件监听器
        setTimeout(() => {
            const saveSettingsBtn = document.getElementById('save-settings-btn');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', function() {
                    // 保存设置
                    advancedConfig.realtime.minConfidence = parseInt(document.getElementById('confidence-slider').value) / 100;
                    advancedConfig.realtime.maxHistory = parseInt(document.getElementById('history-slider').value);
                    advancedConfig.analytics.collectData = document.getElementById('collect-data-toggle').checked;
                    
                    // 显示通知
                    showNotification('设置已保存', 'success');
                    
                    // 如果实时识别已启动，重启以应用新设置
                    if (advancedConfig.realtime.enabled) {
                        stopRealtimeRecognition();
                        startRealtimeRecognition();
                    }
                });
            }
            
            // 添加滑块事件监听器
            const confidenceSlider = document.getElementById('confidence-slider');
            if (confidenceSlider) {
                confidenceSlider.addEventListener('input', function(e) {
                    const value = parseInt(e.target.value);
                    document.getElementById('confidence-value').textContent = value + '%';
                });
            }
            
            const historySlider = document.getElementById('history-slider');
            if (historySlider) {
                historySlider.addEventListener('input', function(e) {
                    const value = parseInt(e.target.value);
                    document.getElementById('history-value').textContent = value;
                });
            }
        }, 500);
    }
}

/**
 * 设置性能控制
 */
function setupPerformanceControls() {
    // 创建性能控制面板
    const performanceSection = document.createElement('div');
    performanceSection.className = 'performance-section mt-4 d-none';
    performanceSection.id = 'performance-panel';
    performanceSection.innerHTML = `
        <h5 class="section-title">性能控制</h5>
        <div class="mb-2">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="high-performance-toggle">
                <label class="form-check-label" for="high-performance-toggle">高性能模式</label>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="low-power-toggle">
                <label class="form-check-label" for="low-power-toggle">低功耗模式</label>
            </div>
        </div>
        <div class="d-flex justify-content-between">
            <span>识别间隔:</span>
            <div class="d-flex align-items-center">
                <input type="range" class="form-range me-2" id="interval-slider" min="100" max="2000" step="100" value="500" style="width: 100px;">
                <span id="interval-value">500ms</span>
            </div>
        </div>
    `;
    
    // 查找插入位置
    const infoPanel = document.querySelector('.info-panel');
    if (infoPanel) {
        infoPanel.appendChild(performanceSection);
    }
    
    // 添加事件监听器
    setTimeout(() => {
        const highPerfToggle = document.getElementById('high-performance-toggle');
        const lowPowerToggle = document.getElementById('low-power-toggle');
        const intervalSlider = document.getElementById('interval-slider');
        
        if (highPerfToggle) {
            highPerfToggle.addEventListener('change', function(e) {
                advancedConfig.performance.highPerformanceMode = e.target.checked;
                
                if (e.target.checked) {
                    // 高性能模式 - 间隔短
                    advancedConfig.realtime.interval = 100;
                    intervalSlider.value = 100;
                    document.getElementById('interval-value').textContent = '100ms';
                    
                    // 禁用低功耗模式
                    advancedConfig.performance.lowPowerMode = false;
                    lowPowerToggle.checked = false;
                }
                
                // 如果实时识别已启动，重启以应用新设置
                if (advancedConfig.realtime.enabled) {
                    stopRealtimeRecognition();
                    startRealtimeRecognition();
                }
            });
        }
        
        if (lowPowerToggle) {
            lowPowerToggle.addEventListener('change', function(e) {
                advancedConfig.performance.lowPowerMode = e.target.checked;
                
                if (e.target.checked) {
                    // 低功耗模式 - 间隔长
                    advancedConfig.realtime.interval = 1000;
                    intervalSlider.value = 1000;
                    document.getElementById('interval-value').textContent = '1000ms';
                    
                    // 禁用高性能模式
                    advancedConfig.performance.highPerformanceMode = false;
                    highPerfToggle.checked = false;
                }
                
                // 如果实时识别已启动，重启以应用新设置
                if (advancedConfig.realtime.enabled) {
                    stopRealtimeRecognition();
                    startRealtimeRecognition();
                }
            });
        }
        
        if (intervalSlider) {
            intervalSlider.addEventListener('input', function(e) {
                const value = parseInt(e.target.value);
                advancedConfig.realtime.interval = value;
                document.getElementById('interval-value').textContent = value + 'ms';
                
                // 如果实时识别已启动，重启以应用新设置
                if (advancedConfig.realtime.enabled) {
                    stopRealtimeRecognition();
                    startRealtimeRecognition();
                }
            });
        }
    }, 500);
}

/**
 * 切换高级功能显示
 */
function toggleAdvancedFeatures() {
    const analyticsPanel = document.getElementById('analytics-panel');
    const performancePanel = document.getElementById('performance-panel');
    
    if (analyticsPanel) {
        analyticsPanel.classList.toggle('d-none');
    }
    
    if (performancePanel) {
        performancePanel.classList.toggle('d-none');
    }
}

/**
 * 显示通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (success|info|warning|danger)
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050; min-width: 200px; max-width: 300px; opacity: 0; transform: translateY(-20px);';
    notification.innerHTML = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s, transform 0.3s';
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        // 移除元素
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 在页面加载时初始化高级功能
document.addEventListener('DOMContentLoaded', function() {
    // 等待基本功能初始化完成后再初始化高级功能
    setTimeout(initAdvancedFeatures, 1000);
}); 