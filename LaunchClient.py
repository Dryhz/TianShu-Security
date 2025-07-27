#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
人脸识别系统一键启动脚本
"""

import os
import sys
import time
import subprocess
import platform
import webbrowser
import importlib.util
import socket
import shutil

# 获取项目根目录
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FACEWEB_DIR = os.path.join(PROJECT_ROOT, "FaceWeb")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
MODEL_DIR = os.path.join(DATA_DIR, "data_dlib")

# 模型文件路径
MODEL_FILES = {
    "shape_predictor": os.path.join(MODEL_DIR, "shape_predictor_68_face_landmarks.dat"),
    "face_recognition": os.path.join(MODEL_DIR, "dlib_face_recognition_resnet_model_v1.dat")
}

# 必需的Python包及其导入名称 (如果不同)
REQUIRED_PACKAGES = [
    {"name": "flask", "import_name": "flask"},
    {"name": "numpy", "import_name": "numpy"},
    {"name": "dlib", "import_name": "dlib"},
    {"name": "opencv-python", "import_name": "cv2"},
    {"name": "werkzeug", "import_name": "werkzeug"}
]

# 默认端口
DEFAULT_PORT = 8888

# 带有颜色的输出（优化版）
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(message):
    """打印带有颜色的标题"""
    line = "═" * 60
    print(f"\n{Colors.BLUE}{line}")
    print(f"{Colors.BOLD}{message}{Colors.END}")
    print(f"{Colors.BLUE}{line}{Colors.END}\n")

def print_step(step_num, message):
    """打印步骤信息"""
    print(f"{Colors.GREEN}[步骤 {step_num}] {message}{Colors.END}")

def print_error(message):
    """打印错误信息"""
    print(f"{Colors.RED}[错误] {message}{Colors.END}")

def print_warning(message):
    """打印警告信息"""
    print(f"{Colors.YELLOW}[警告] {message}{Colors.END}")

def print_success(message):
    """打印成功信息"""
    print(f"{Colors.GREEN}[成功] {message}{Colors.END}")

def center_text(text, width=None):
    """将文本居中显示，考虑中文字符宽度"""
    if width is None:
        # 获取终端宽度，如果无法获取则使用默认值80
        try:
            width = shutil.get_terminal_size().columns
        except:
            width = 80
    
    # 计算文本宽度（中文字符算2个宽度）
    text_width = sum(2 if '\u4e00' <= char <= '\u9fff' else 1 for char in text)
    padding = max(0, width - text_width) // 2
    return ' ' * padding + text

def check_python_version():
    """检查Python版本是否满足要求"""
    print_step(1, "检查Python版本...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print_error(f"需要Python 3.7或更高版本，当前版本为 {version.major}.{version.minor}.{version.micro}")
        return False
    
    print_success(f"Python版本 {version.major}.{version.minor}.{version.micro} 满足要求")
    return True

def check_dependencies():
    """快速检查是否安装了所需的依赖包"""
    print_step(2, "检查必要的Python包...")
    missing_packages = []

    # 快速并行检查所有包
    for package in REQUIRED_PACKAGES:
        package_name = package["name"]
        import_name = package["import_name"]
        
        try:
            # 尝试导入模块
            __import__(import_name)
        except ImportError:
            missing_packages.append(package_name)
    
    if missing_packages:
        print_warning(f"以下包未安装或无法导入: {', '.join(missing_packages)}")
        user_input = input("是否自动安装这些包? (y/n): ")
        if user_input.lower() == 'y':
            print("正在安装缺失的包...")
            try:
                for package_name in missing_packages:
                        print(f"安装 {package_name}...")
                        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
                print_success("所有包已成功安装")
            except Exception as e:
                print_error(f"安装包时出错: {e}")
                return False
        else:
            print_warning("请手动安装缺失的包后再次运行此脚本")
            return False
    else:
        print_success("所有必要的Python包已安装")
    
    return True

def check_model_files():
    """检查模型文件是否存在"""
    print_step(3, "检查模型文件...")
    missing_models = []
    
    for name, path in MODEL_FILES.items():
        if not os.path.exists(path):
            missing_models.append(f"{name}: {path}")
    
    if missing_models:
        print_error("以下模型文件缺失:")
        for model in missing_models:
            print(f"  - {model}")
            print("\n模型文件可从官方网站下载: http://dlib.net/files/")
        return False
    
    print_success("所有必要的模型文件已找到")
    return True

def check_directories():
    """检查并创建必要的目录"""
    print_step(4, "检查项目目录结构...")
    
    # 确保数据目录存在
    os.makedirs(os.path.join(DATA_DIR, "database_faces"), exist_ok=True)
    os.makedirs(os.path.join(FACEWEB_DIR, "static", "uploads"), exist_ok=True)
    
    print_success("项目目录结构已准备完毕")
    return True

def get_local_ip():
    """获取本机局域网IP地址"""
    try:
        # 创建一个临时套接字连接到外部地址，获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def is_port_in_use(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_web_server():
    """启动Web服务器"""
    print_step(5, "启动智能门卫管理系统...")
    
    # 检查app.py是否存在
    app_path = os.path.join(FACEWEB_DIR, "app.py")
    if not os.path.exists(app_path):
        print_error(f"找不到Web应用主文件: {app_path}")
        return False
    
    # 获取当前平台
    system = platform.system()
    local_ip = get_local_ip()
    port = DEFAULT_PORT
    
    # 检查端口是否被占用
    if is_port_in_use(port):
        print_warning(f"端口 {port} 已被占用，尝试使用其他端口")
        for test_port in range(port+1, port+10):
            if not is_port_in_use(test_port):
                port = test_port
                break
        else:
            print_error("无法找到可用端口")
            return False
        print_success(f"使用端口: {port}")
    
    try:
        # 设置环境变量 - 简化版本，避免使用可能导致问题的环境变量
        env = os.environ.copy()
        env['FLASK_APP'] = 'app.py'
        
        # 在不同平台上使用不同的命令
        if system == "Windows":
            # 创建启动命令 - 修复命令，确保正确引用包含空格的路径
            python_exe = f'"{sys.executable}"'  # 引用Python解释器路径
            faceweb_dir = f'"{FACEWEB_DIR}"'    # 引用FaceWeb目录路径
            app_path_quoted = f'"{app_path}"'   # 引用app.py文件路径
            
            # 添加端口参数
            cmd = f'cd /d {faceweb_dir} && {python_exe} {app_path_quoted} --port={port}'
            
            # 在新的命令提示符窗口中启动
            print("在新窗口中启动Web服务器...")
            subprocess.Popen(f'start cmd /K "{cmd}"', shell=True, env=env)
        else:  # Linux或MacOS
            # 在新的终端窗口中启动 - 使用引号包裹路径
            python_exe = f'"{sys.executable}"'
            faceweb_dir = f'"{FACEWEB_DIR}"'
            app_path_quoted = f'"{app_path}"'
            
            # 添加端口参数
            cmd = f'cd {faceweb_dir} && {python_exe} {app_path_quoted} --port={port}'
            
            if system == "Darwin":  # MacOS
                terminal_script = f'tell application "Terminal" to do script "{cmd}"'
                subprocess.Popen(['osascript', '-e', terminal_script], env=env)
            else:  # Linux
                try:
                    # 尝试使用不同的终端模拟器
                    terminals = ['gnome-terminal', 'xterm', 'konsole', 'xfce4-terminal']
                    
                    for term in terminals:
                        try:
                            subprocess.Popen([term, '--', 'bash', '-c', f'{cmd}; exec bash'], env=env)
                            break
                        except FileNotFoundError:
                            continue
                    else:
                        # 如果所有终端模拟器都不可用，使用当前终端
                        print_warning("无法在新终端中启动，将在当前终端运行服务器")
                        print("按Ctrl+C可以停止服务器")
                        subprocess.call(cmd, shell=True, env=env)
                        return True
                except Exception as e:
                    print_error(f"启动终端出错: {e}")
                    print_warning("将在当前终端运行服务器")
                    print("按Ctrl+C可以停止服务器")
                    subprocess.call(cmd, shell=True, env=env)
                    return True
        
        # 等待服务器启动 - 动态检测而不是硬编码等待
        print("等待服务器启动...")
        max_wait = 10  # 最长等待10秒
        start_time = time.time()
        while not is_port_in_use(port):
            if time.time() - start_time > max_wait:
                print_warning("服务器启动超时，但仍将尝试打开浏览器")
                break
            time.sleep(0.5)
        
        # 自动打开浏览器
        try:
            url = f"http://localhost:{port}"
            webbrowser.open(url)
        except Exception:
            print_warning("无法自动打开浏览器")
        
        # 打印居中的服务器信息
        width = shutil.get_terminal_size().columns
        line = "═" * width
        print("\n" + line)
        print(center_text(f"{Colors.BOLD}智能门卫管理系统已启动{Colors.END}", width))
        print(center_text(f"* 本地访问: http://localhost:{port}", width))
        print(center_text(f"* 局域网访问 (手机等设备): http://{local_ip}:{port}", width))
        print(center_text("提示: 要停止服务器，请关闭命令窗口或按Ctrl+C", width))
        print(line + "\n")
        
        return True
    except Exception as e:
        print_error(f"启动服务器时出错: {e}")
        print(f"请手动运行: python {app_path}")
        return False

def show_welcome():
    """显示欢迎信息 - 优化后更加简洁但保持科技感"""
    # 获取终端宽度
    width = shutil.get_terminal_size().columns
    line = "═" * width
    
    print(f"\n{Colors.BLUE}{line}")
    print(center_text(f"{Colors.BOLD}天枢安全 —— 智能门卫管理系统{Colors.END}", width))
    print(center_text(f"{Colors.BOLD}人工智能2411 第一组作品{Colors.END}", width))
    print(f"{Colors.BLUE}{line}{Colors.END}\n")

def main():
    """主函数"""
    # 清除终端
    os.system('cls' if os.name == 'nt' else 'clear')
    
    # 显示优化后的欢迎信息
    show_welcome()
    
    # 输出简洁的调试信息
    width = shutil.get_terminal_size().columns
    print(center_text(f"Python: {sys.version.split()[0]}", width))
    print(center_text(f"项目路径: {PROJECT_ROOT}", width))
    print(center_text(f"{'-' * 30}", width))
    
    # 执行启动检查 - 简化的自检流程
    checks = [
        check_python_version,
        check_dependencies,
        check_model_files,
        check_directories
    ]
    
    for check in checks:
        if not check():
            print_error("启动检查未通过，程序退出")
            input("按任意键退出...")
            return
    
    # 启动Web服务器
    start_web_server()
    
    # 保持脚本运行，便于查看输出信息
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n用户中断，程序退出")

if __name__ == "__main__":
    main() 