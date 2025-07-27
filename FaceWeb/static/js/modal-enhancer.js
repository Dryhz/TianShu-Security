/**
 * 模态框增强脚本
 * 为作者信息弹窗添加动画和交互效果
 */

document.addEventListener('DOMContentLoaded', function() {
    // 创建作者信息按钮
    createAuthorButton();
    
    // 增强模态框动画
    enhanceModalAnimations();
    
    // 添加按钮交互效果
    setupButtonInteractions();
});

/**
 * 创建固定在右下角的作者信息按钮
 */
function createAuthorButton() {
    // 创建容器
    const container = document.createElement('div');
    container.id = 'author-info-container';
    container.className = 'position-fixed';
    container.style.cssText = 'bottom: 20px; right: 20px; z-index: 1000;';
    
    // 创建按钮
    const button = document.createElement('button');
    button.id = 'floating-author-btn';
    button.className = 'btn shadow';
    button.style.cssText = 'border-radius: 50%; width: 50px; height: 50px; backdrop-filter: blur(8px); ' +
                         'background: linear-gradient(135deg, rgba(13, 110, 253, 0.8) 0%, rgba(16, 70, 200, 0.9) 100%); ' +
                         'color: white; font-weight: 500; position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);';
    
    // 科技感角标
    const topLeftCorner = document.createElement('div');
    topLeftCorner.className = 'position-absolute';
    topLeftCorner.style.cssText = 'top: 0; left: 0; width: 10px; height: 10px; ' +
                                'border-top: 1px solid rgba(255, 255, 255, 0.5); border-left: 1px solid rgba(255, 255, 255, 0.5);';
    
    const bottomRightCorner = document.createElement('div');
    bottomRightCorner.className = 'position-absolute';
    bottomRightCorner.style.cssText = 'bottom: 0; right: 0; width: 10px; height: 10px; ' +
                                    'border-bottom: 1px solid rgba(255, 255, 255, 0.5); border-right: 1px solid rgba(255, 255, 255, 0.5);';
    
    // 按钮内容
    const buttonContent = document.createElement('div');
    buttonContent.className = 'd-flex align-items-center justify-content-center h-100';
    buttonContent.innerHTML = '<i class="fas fa-code"></i>';
    
    // 组装按钮
    button.appendChild(topLeftCorner);
    button.appendChild(bottomRightCorner);
    button.appendChild(buttonContent);
    container.appendChild(button);
    
    // 添加到页面
    document.body.appendChild(container);
    
    // 添加按钮点击事件
    button.addEventListener('click', function(e) {
        // 创建波纹效果
        createRippleEffect(e, this);
        
        // 添加点击动画效果
        this.classList.add('shadow-pulse');
        
        // 显示模态框
        const authorInfoModal = new bootstrap.Modal(document.getElementById('authorInfoModal'), {
            backdrop: false
        });
        authorInfoModal.show();
        
        // 移除动画类
        setTimeout(() => {
            this.classList.remove('shadow-pulse');
        }, 700);
    });
}

/**
 * 创建点击波纹效果
 */
function createRippleEffect(e, element) {
    // 创建波纹元素
    const ripple = document.createElement('span');
    ripple.style.cssText = 'position: absolute; background: rgba(255, 255, 255, 0.3); border-radius: 50%; transform: scale(0); pointer-events: none;';
    
    // 计算波纹位置
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    // 设置波纹样式
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple-effect');
    
    // 添加到按钮
    element.appendChild(ripple);
    
    // 移除波纹
    setTimeout(() => {
        ripple.remove();
    }, 700);
}

/**
 * 增强模态框动画
 */
function enhanceModalAnimations() {
    const modalElement = document.getElementById('authorInfoModal');
    if (!modalElement) return;
    
    // 模态框显示动画
    modalElement.addEventListener('show.bs.modal', function() {
        const modalDialog = this.querySelector('.modal-dialog');
        modalDialog.style.transform = 'translateX(100%)';
        modalDialog.style.opacity = '0';
        setTimeout(() => {
            modalDialog.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            modalDialog.style.transform = 'translateX(0)';
            modalDialog.style.opacity = '1';
        }, 50);
    });
    
    // 模态框隐藏动画
    modalElement.addEventListener('hide.bs.modal', function() {
        const modalDialog = this.querySelector('.modal-dialog');
        modalDialog.style.transform = 'translateX(100%)';
        modalDialog.style.opacity = '0';
    });
}

/**
 * 设置按钮交互效果
 */
function setupButtonInteractions() {
    // 增强高级设置按钮
    const advancedSettingsBtn = document.getElementById('btn-advanced-settings');
    if (advancedSettingsBtn) {
        // 添加点击效果
        advancedSettingsBtn.addEventListener('click', function(e) {
            // 创建波纹效果
            createRippleEffect(e, this);
            
            // 切换高级功能显示
            if (typeof toggleAdvancedFeatures === 'function') {
                toggleAdvancedFeatures();
            }
        });
    }
    
    // 添加CSS样式
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
        @keyframes shadow-pulse {
            0% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(13, 110, 253, 0); }
            100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); }
        }
        
        .shadow-pulse {
            animation: shadow-pulse 1s 1;
        }
        
        #floating-author-btn {
            transition: all 0.25s ease-out;
            box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2);
        }
        
        #floating-author-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(13, 110, 253, 0.3);
        }
        
        #btn-advanced-settings {
            transition: transform 0.2s, box-shadow 0.3s;
        }
        
        #btn-advanced-settings:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0, 132, 255, 0.2);
        }
        
        /* 波纹效果动画 */
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .ripple-effect {
            animation: ripple 0.7s linear;
        }
        
        /* 非模态弹窗样式 */
        .modal.fade {
            background-color: transparent !important;
        }
        
        .modal-backdrop {
            display: none !important;
        }
        
        /* 确保模态框在最上层 */
        #authorInfoModal .modal-dialog {
            z-index: 1056;
        }
        
        /* 作者信息卡片悬浮效果 */
        .author-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 132, 255, 0.15);
        }
    `;
    document.head.appendChild(styleSheet);
} 