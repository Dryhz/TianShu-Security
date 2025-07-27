/**
 * 数字雨效果
 * 类似黑客帝国中的代码雨，为页面增加科技感
 */
class DigitalRain {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            selector: options.selector || 'body',
            fontSize: options.fontSize || 14,
            rainColor: options.rainColor || 'rgba(0, 183, 255, 0.07)',
            rainColorBright: options.rainColorBright || 'rgba(0, 220, 255, 0.4)',
            speed: options.speed || 1,
            density: options.density || 0.08,
            symbols: options.symbols || '01'
        };
        
        // 扩展字符集
        if (options.useExtendedSymbols) {
            this.config.symbols += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%#&_(){}[]<>';
        }
        
        this.columns = [];  // 雨滴列
        this.active = false;
        
        // 创建容器
        this.container = document.createElement('div');
        this.container.className = 'digital-rain';
        this.container.style.zIndex = '-1';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
        this.container.style.pointerEvents = 'none';
        
        // 添加到DOM
        const target = document.querySelector(this.config.selector);
        if (target === document.body) {
            document.body.appendChild(this.container);
        } else {
            target.style.position = 'relative';
            target.appendChild(this.container);
        }
        
        // 初始化
        this.init();
    }
    
    init() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // 计算列数
        const columnCount = Math.floor(this.width / (this.config.fontSize * 0.7));
        
        // 随机创建列
        for (let i = 0; i < columnCount; i++) {
            if (Math.random() < this.config.density) {
                this.createColumn(i);
            }
        }
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (this.active) {
                this.reset();
            }
        });
    }
    
    createColumn(index) {
        // 创建一个雨滴列
        const column = document.createElement('div');
        column.className = 'rain-column';
        column.style.left = (index * this.config.fontSize * 0.7) + 'px';
        column.style.fontSize = this.config.fontSize + 'px';
        column.style.color = this.config.rainColor;
        column.style.opacity = Math.random() * 0.5 + 0.5;
        
        // 随机初始位置和速度
        const speed = (Math.random() * 0.5 + 0.5) * this.config.speed;
        const length = Math.floor(Math.random() * 15) + 5;
        const y = -this.config.fontSize * length;
        
        // 保存列信息
        this.columns.push({
            element: column,
            y: y,
            speed: speed,
            length: length,
            chars: []
        });
        
        // 添加到容器
        this.container.appendChild(column);
    }
    
    start() {
        if (!this.active) {
            this.active = true;
            this.animationFrame = requestAnimationFrame(this.animate.bind(this));
        }
        return this;
    }
    
    stop() {
        if (this.active) {
            this.active = false;
            cancelAnimationFrame(this.animationFrame);
        }
        return this;
    }
    
    reset() {
        this.stop();
        this.columns.forEach(column => {
            column.element.remove();
        });
        this.columns = [];
        this.init();
        this.start();
    }
    
    animate() {
        if (!this.active) return;
        
        this.columns.forEach(column => {
            // 更新位置
            column.y += column.speed;
            
            // 生成字符
            let html = '';
            for (let i = 0; i < column.length; i++) {
                const charIndex = Math.floor(column.y / this.config.fontSize) - i;
                
                if (charIndex < 0) continue;
                
                // 随机更换字符
                if (!column.chars[i] || Math.random() < 0.02) {
                    column.chars[i] = this.config.symbols.charAt(
                        Math.floor(Math.random() * this.config.symbols.length)
                    );
                }
                
                // 设置样式 - 第一个字符亮一些
                const char = column.chars[i];
                if (i === 0) {
                    html += `<span style="color:${this.config.rainColorBright}">${char}</span><br>`;
                } else {
                    html += `${char}<br>`;
                }
            }
            
            column.element.innerHTML = html;
            column.element.style.top = (column.y - column.length * this.config.fontSize) + 'px';
            
            // 如果移出屏幕，重置位置
            if (column.y > this.height + column.length * this.config.fontSize) {
                column.y = -column.length * this.config.fontSize;
                column.speed = (Math.random() * 0.5 + 0.5) * this.config.speed;
                column.length = Math.floor(Math.random() * 15) + 5;
                column.chars = [];
            }
        });
        
        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    }
}

// 页面加载后启动效果
document.addEventListener('DOMContentLoaded', function() {
    // 判断是否为高性能设备
    const isHighPerformance = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    // 高性能设备使用完整效果，低性能设备使用简化效果
    const digitalRain = new DigitalRain({
        rainColor: 'rgba(0, 183, 255, 0.07)',
        rainColorBright: 'rgba(0, 220, 255, 0.4)',
        fontSize: isHighPerformance ? 14 : 18,
        speed: isHighPerformance ? 1 : 0.5,
        density: isHighPerformance ? 0.08 : 0.03,
        useExtendedSymbols: isHighPerformance
    });
    
    digitalRain.start();
}); 