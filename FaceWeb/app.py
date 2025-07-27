#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import cv2
import base64
import numpy as np
import warnings
import argparse
from datetime import datetime
from flask import Flask, render_template, request, jsonify, Response, redirect, url_for, send_from_directory
import json
from werkzeug.utils import secure_filename
import threading

# 添加父目录到路径，确保能导入核心库
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# 在导入dlib之前设置环境变量，彻底禁用CUDA
os.environ["DLIB_USE_CUDA"] = "0"
# 忽略dlib的CUDA相关警告
warnings.filterwarnings("ignore", category=RuntimeWarning, module="dlib")
warnings.filterwarnings(action='ignore')

# 延迟导入dlib相关模块
import dlib

# 尝试导入可选依赖
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    from sklearn.cluster import KMeans
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# 定义应用目录
app = Flask(__name__)
app.config['SECRET_KEY'] = 'tianshu_security_face_recognition'
app.config['UPLOAD_FOLDER'] = os.path.join(parent_dir, 'data', 'database_faces')
app.config['UPLOAD_TEMP'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['UPLOAD_TEMP'], exist_ok=True)

# 人脸识别核心类
class FaceRecognitionCore:
    def __init__(self):
        self._model_dir = os.path.join(parent_dir, 'data', 'data_dlib')
        self._shape_path = os.path.join(self._model_dir, 'shape_predictor_68_face_landmarks.dat')
        self._reco_path = os.path.join(self._model_dir, 'dlib_face_recognition_resnet_model_v1.dat')
        
        # 检查模型文件
        missing_models = [p for p in (self._shape_path, self._reco_path) if not os.path.exists(p)]
        if missing_models:
            msg = "\n".join(missing_models)
            print(f"模型文件缺失: {msg}")
            raise FileNotFoundError(f"缺少必要的模型文件: {msg}")
        
        print("正在加载人脸识别模型...")
        self.detector = dlib.get_frontal_face_detector()
        self.predictor = dlib.shape_predictor(self._shape_path)
        self.face_reco_model = dlib.face_recognition_model_v1(self._reco_path)
        print("模型加载完成!")
        
        # 用于存储人脸数据
        self.face_features = []
        self.face_names = []
        
        # 加载已有的人脸数据
        self.load_face_database()
    
    def load_face_database(self):
        """加载人脸数据库"""
        self.face_features = []
        self.face_names = []
        
        face_dir = app.config['UPLOAD_FOLDER']
        if not os.path.exists(face_dir):
            os.makedirs(face_dir)
            return
        
        # 遍历人脸文件夹
        person_folders = [f for f in os.listdir(face_dir) if os.path.isdir(os.path.join(face_dir, f))]
        print(f"发现人脸文件夹: {person_folders}")
        
        for person in person_folders:
            person_dir = os.path.join(face_dir, person)
            image_files = [f for f in os.listdir(person_dir) 
                          if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
            print(f"人脸 '{person}' 包含 {len(image_files)} 张图像")
            
            if not image_files:
                continue
                
            # 提取该人的人脸特征
            person_features = []
            
            for img_file in image_files:
                img_path = os.path.join(person_dir, img_file)
                try:
                    print(f"处理图像: {img_path}")
                    feature = self.extract_features(img_path)
                    if feature is not None:
                        person_features.append(feature)
                    else:
                        print(f"无法从图像提取特征: {img_path}")
                except Exception as e:
                    print(f"处理图像 {img_path} 时出错: {e}")
            
            # 如果没有提取到有效特征，跳过该人
            if not person_features:
                print(f"警告: 未能从'{person}'提取任何有效特征")
                continue
            
            # 特征质量评估和聚类
            if len(person_features) > 1:
                # 计算特征之间的距离矩阵
                num_features = len(person_features)
                distance_matrix = np.zeros((num_features, num_features))
                
                for i in range(num_features):
                    for j in range(i+1, num_features):
                        dist = np.linalg.norm(person_features[i] - person_features[j])
                        distance_matrix[i, j] = dist
                        distance_matrix[j, i] = dist
                
                # 计算每个特征的平均距离
                avg_distances = np.mean(distance_matrix, axis=1)
                
                # 找出异常值 (距离其他特征太远的特征)
                threshold = np.mean(avg_distances) + 1.5 * np.std(avg_distances)
                valid_indices = np.where(avg_distances <= threshold)[0]
                
                # 过滤掉异常值
                filtered_features = [person_features[i] for i in valid_indices]
                
                if len(filtered_features) < len(person_features):
                    print(f"从'{person}'中过滤掉了 {len(person_features) - len(filtered_features)} 个异常特征")
                
                # 如果过滤后没有特征了，使用原始特征
                if not filtered_features:
                    print(f"警告: '{person}'的所有特征都被过滤掉了，使用原始特征")
                    filtered_features = person_features
                
                # 计算平均特征作为代表
                mean_feature = np.mean(filtered_features, axis=0)
                
                # 归一化
                mean_feature = mean_feature / np.linalg.norm(mean_feature)
                
                # 添加到数据库
                self.face_features.append(mean_feature)
                self.face_names.append(person)
                
                # 如果有足够多的特征，添加多个代表特征以提高识别率
                if len(filtered_features) >= 5:
                    # 使用K-means聚类找出不同角度的特征
                    if SKLEARN_AVAILABLE:
                        kmeans = KMeans(n_clusters=min(3, len(filtered_features) // 2), random_state=0).fit(filtered_features)
                        
                        # 获取每个聚类的中心
                        for center in kmeans.cluster_centers_:
                            # 归一化
                            center = center / np.linalg.norm(center)
                            
                            # 如果与已有特征差异足够大，添加为额外特征
                            if min(np.linalg.norm(center - feat) for feat in self.face_features) > 0.1:
                                self.face_features.append(center)
                                self.face_names.append(person)
            else:
                # 只有一个特征，直接添加
                feature = person_features[0]
                self.face_features.append(feature)
                self.face_names.append(person)
        
        print(f"已加载 {len(self.face_names)} 个人脸特征")
        
        # 如果特征数量很多，考虑使用近似最近邻搜索
        if len(self.face_features) > 100:
            try:
                if FAISS_AVAILABLE:
                    print("启用FAISS加速特征匹配")
                    
                    # 将特征转换为适合FAISS的格式
                    features_array = np.array(self.face_features).astype('float32')
                    
                    # 创建索引
                    self.index = faiss.IndexFlatL2(features_array.shape[1])
                    self.index.add(features_array)
                    
                    # 设置使用FAISS标志
                    self.use_faiss = True
            except Exception as e:
                print(f"启用FAISS失败: {e}")
                self.use_faiss = False
        else:
            self.use_faiss = False
    
    def extract_features(self, img_path):
        """从图像中提取人脸特征"""
        try:
            # 读取图像
            if isinstance(img_path, str):
                # 使用OpenCV无法直接读取中文路径，改用numpy和python原生文件操作
                with open(img_path, 'rb') as f:
                    img_data = f.read()
                img_np = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
                if img is None:
                    print(f"无法读取图像: {img_path}")
                    return None
            else:
                img = img_path  # 如果已经是图像数组
            
            # 转换为RGB (dlib需要)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # 图像预处理
            # 1. 直方图均衡化以增强对比度
            img_yuv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2YUV)
            img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
            img_enhanced = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2RGB)
            
            # 2. 轻度高斯模糊减少噪声
            img_blurred = cv2.GaussianBlur(img_enhanced, (3, 3), 0)
            
            # 检测人脸 - 使用更高精度的检测参数
            faces = self.detector(img_blurred, 2)
            if len(faces) == 0:
                print(f"未检测到人脸")
                return None
            
            # 找出最大的人脸（假设这是主要人脸）
            main_face = max(faces, key=lambda rect: (rect.right() - rect.left()) * (rect.bottom() - rect.top()))
            
            # 获取关键点
            shape = self.predictor(img_blurred, main_face)
            
            # 计算特征向量 (128D) - 增加采样次数提高精度
            face_descriptor = self.face_reco_model.compute_face_descriptor(img_blurred, shape, 10)
            
            # 转换为numpy数组
            return np.array(face_descriptor)
        except Exception as e:
            print(f"提取特征时出错: {e}")
            return None
    
    def recognize_face(self, img):
        """识别图像中的人脸"""
        if img is None:
            return []
        
        # 转换为RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # 检测人脸 - 增加第二个参数以提高检测精度
        faces = self.detector(img_rgb, 2)
        results = []
        
        # 记录性能数据
        performance_data = {
            "detection_time": 0,
            "recognition_time": 0,
            "total_time": 0
        }
        
        start_time = time.time()
        
        for face in faces:
            # 获取人脸坐标
            x1, y1, x2, y2 = face.left(), face.top(), face.right(), face.bottom()
            
            # 获取关键点
            shape = self.predictor(img_rgb, face)
            
            # 计算特征向量
            face_descriptor = self.face_reco_model.compute_face_descriptor(img_rgb, shape, 10)  # 增加采样次数提高精度
            face_feature = np.array(face_descriptor)
            
            # 比较与数据库中所有人脸的距离
            recognition_start = time.time()
            
            if hasattr(self, 'use_faiss') and self.use_faiss and len(self.face_features) > 0:
                # 使用FAISS加速特征匹配
                query_feature = np.array([face_feature]).astype('float32')
                distances, indices = self.index.search(query_feature, min(5, len(self.face_features)))
                
                # 转换为与非FAISS版本相同的格式
                distances = [(float(distances[0][i]), self.face_names[int(indices[0][i])]) 
                            for i in range(len(indices[0]))]
            else:
                # 常规特征匹配
                distances = []
                for i, stored_feature in enumerate(self.face_features):
                    # 计算欧氏距离
                    distance = np.linalg.norm(face_feature - stored_feature)
                    distances.append((distance, self.face_names[i]))
            
            recognition_time = time.time() - recognition_start
            performance_data["recognition_time"] = round(recognition_time * 1000)
            
            # 获取最小距离的人脸
            if distances:
                # 使用加权投票策略提高识别准确性
                # 获取前3个最接近的匹配（如果有的话）
                top_matches = sorted(distances, key=lambda x: x[0])[:3]
                
                # 如果最佳匹配的距离足够小，直接采用
                if top_matches[0][0] < 0.4:  # 更严格的阈值
                    min_distance, person_name = top_matches[0]
                    confidence = 1 - min_distance
                    
                    results.append({
                        'name': person_name,
                        'distance': float(min_distance),
                        'confidence': float(confidence),
                        'rect': [int(x1), int(y1), int(x2), int(y2)]
                    })
                # 如果最佳匹配不够明确，但有多个相近的匹配，使用加权投票
                elif len(top_matches) >= 2 and top_matches[0][0] < 0.55:
                    # 计算权重（距离的倒数）
                    weights = [1/(d+0.01) for d, _ in top_matches]
                    total_weight = sum(weights)
                    
                    # 统计加权票数
                    vote_dict = {}
                    for i, (dist, name) in enumerate(top_matches):
                        vote_dict[name] = vote_dict.get(name, 0) + weights[i]/total_weight
                    
                    # 获取得票最多的人
                    winner = max(vote_dict.items(), key=lambda x: x[1])
                    
                    # 如果得票率超过阈值，认为识别成功
                    if winner[1] > 0.6:
                        # 找到这个人的最小距离
                        for dist, name in top_matches:
                            if name == winner[0]:
                                min_distance = dist
                                break
                        
                        confidence = 1 - min_distance
                        
                        results.append({
                            'name': winner[0],
                            'distance': float(min_distance),
                            'confidence': float(confidence),
                            'rect': [int(x1), int(y1), int(x2), int(y2)]
                        })
                    else:
                        # 无法确定身份
                        results.append({
                            'name': 'unknown',
                            'distance': float(0.6),  # 默认距离
                            'confidence': float(0.4),  # 默认可信度
                        'rect': [int(x1), int(y1), int(x2), int(y2)]
                    })
                else:
                    # 距离太大，识别为未知人脸
                    results.append({
                        'name': 'unknown',
                        'distance': float(top_matches[0][0]),
                        'confidence': float(1 - top_matches[0][0]),
                        'rect': [int(x1), int(y1), int(x2), int(y2)]
                    })
            else:
                results.append({
                    'name': 'unknown',
                    'distance': float(1.0),
                    'confidence': float(0.0),
                    'rect': [int(x1), int(y1), int(x2), int(y2)]
                })
        
        # 计算总耗时
        total_time = time.time() - start_time
        performance_data["total_time"] = round(total_time * 1000)
        performance_data["detection_time"] = round((total_time - performance_data["recognition_time"]) * 1000)
        
        # 将性能数据附加到结果中
        for result in results:
            result["performance"] = performance_data
        
        return results
    
    @staticmethod
    def draw_face_rects(img, results):
        """在图像上绘制人脸框和标签"""
        img_with_rect = img.copy()
        
        for res in results:
            name = res['name']
            distance = res['distance']
            rect = res['rect']
            
            x1, y1, x2, y2 = rect
            
            # 计算相似度
            similarity = int((1 - distance) * 100)
            
            # 设置不同的颜色
            if name == 'unknown':
                color = (0, 0, 255)  # 红色
            else:
                color = (0, 255, 0)  # 绿色
            
            # 绘制人脸框 - 加粗确保可见
            cv2.rectangle(img_with_rect, (x1, y1), (x2, y2), color, 2)
            
            # 绘制背景和文字
            label = f"{name} ({similarity}%)"
            
            # 获取文本大小
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            
            # 绘制填充矩形
            cv2.rectangle(img_with_rect, (x1, y1 - 25), (x1 + w + 10, y1), color, -1)
            
            # 绘制文本
            cv2.putText(img_with_rect, label, (x1 + 5, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        return img_with_rect
    
    def create_face_folder(self, face_name):
        """创建人脸文件夹"""
        face_dir = os.path.join(app.config['UPLOAD_FOLDER'], face_name)
        print(f"尝试创建人脸文件夹: {face_dir}")
        
        if os.path.exists(face_dir):
            print(f"文件夹已存在: {face_dir}")
            return False, f"名为 {face_name} 的人脸文件夹已存在"
        
        try:
            os.makedirs(face_dir)
            print(f"成功创建文件夹: {face_dir}")
            return True, f"已创建人脸文件夹: {face_name}"
        except Exception as e:
            print(f"创建文件夹失败: {str(e)}")
            return False, f"创建文件夹失败: {str(e)}"
    
    def add_face_image(self, face_name, img_data):
        """添加人脸图像到数据库"""
        face_dir = os.path.join(app.config['UPLOAD_FOLDER'], face_name)
        print(f"添加人脸图像到目录: {face_dir}")
        
        if not os.path.exists(face_dir):
            print(f"人脸文件夹不存在: {face_dir}")
            return False, f"人脸文件夹 {face_name} 不存在"
        
        # 生成时间戳文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        img_path = os.path.join(face_dir, f"{timestamp}.jpg")
        print(f"保存图像到: {img_path}")
        
        try:
            # 解码图像数据
            img_np = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
            
            if img is None:
                return False, "无法解码图像数据"
            
            # 转换为RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # 检测人脸
            faces = self.detector(img_rgb, 2)
            if len(faces) == 0:
                return False, "未检测到人脸"
            
            # 找出最大的人脸
            main_face = max(faces, key=lambda rect: (rect.right() - rect.left()) * (rect.bottom() - rect.top()))
            
            # 获取人脸区域
            x1, y1, x2, y2 = main_face.left(), main_face.top(), main_face.right(), main_face.bottom()
            face_width = x2 - x1
            face_height = y2 - y1
            
            # 人脸质量评估
            # 1. 检查人脸大小
            if face_width < 80 or face_height < 80:
                return False, "人脸太小，请提供更清晰的图像"
            
            # 2. 获取关键点
            shape = self.predictor(img_rgb, main_face)
            
            # 3. 检查关键点质量
            landmarks = [(shape.part(i).x, shape.part(i).y) for i in range(shape.num_parts)]
            
            # 4. 计算眼睛开合度（仅用于记录，不进行判断）
            # 左眼：36-41, 右眼：42-47
            left_eye_height = np.mean([landmarks[37][1], landmarks[38][1]]) - np.mean([landmarks[40][1], landmarks[41][1]])
            left_eye_width = landmarks[39][0] - landmarks[36][0]
            left_eye_ratio = left_eye_height / left_eye_width if left_eye_width > 0 else 0
            
            right_eye_height = np.mean([landmarks[43][1], landmarks[44][1]]) - np.mean([landmarks[46][1], landmarks[47][1]])
            right_eye_width = landmarks[45][0] - landmarks[42][0]
            right_eye_ratio = right_eye_height / right_eye_width if right_eye_width > 0 else 0
            
            eye_aspect_ratio = (left_eye_ratio + right_eye_ratio) / 2
            
            # 5. 检查人脸角度
            # 计算两眼中心点
            left_eye_center = ((landmarks[36][0] + landmarks[39][0]) // 2, (landmarks[36][1] + landmarks[39][1]) // 2)
            right_eye_center = ((landmarks[42][0] + landmarks[45][0]) // 2, (landmarks[42][1] + landmarks[45][1]) // 2)
            
            # 计算眼睛角度
            dy = right_eye_center[1] - left_eye_center[1]
            dx = right_eye_center[0] - left_eye_center[0]
            angle = np.degrees(np.arctan2(dy, dx))
            
            if abs(angle) > 15:
                return False, "人脸角度过大，请正视摄像头"
            
            # 保存图像
            with open(img_path, 'wb') as f:
                f.write(img_data)
                print(f"图像保存成功: {img_path}")
                
                # 创建特征描述文件
                feature_data = {
                    "timestamp": timestamp,
                    "face_rect": [int(x1), int(y1), int(x2), int(y2)],
                    "quality": {
                        "size": [face_width, face_height],
                        "eye_aspect_ratio": float(eye_aspect_ratio),
                        "face_angle": float(angle)
                    }
                }
                
                # 保存特征数据
                feature_path = os.path.join(face_dir, f"{timestamp}.json")
                with open(feature_path, 'w') as f:
                    json.dump(feature_data, f, indent=2)
            
            return True, f"已保存人脸图像: {os.path.basename(img_path)}"
        except Exception as e:
            print(f"保存图像失败: {e}")
            return False, f"保存图像失败: {str(e)}"
    
    def get_face_database_info(self):
        """获取人脸数据库信息"""
        face_dir = app.config['UPLOAD_FOLDER']
        print(f"获取人脸数据库信息: {face_dir}")
        
        if not os.path.exists(face_dir):
            print(f"人脸数据库目录不存在: {face_dir}")
            return {
                'total_faces': 0,
                'total_images': 0,
                'faces': []
            }
        
        face_info = []
        total_images = 0
        
        # 遍历人脸文件夹
        person_folders = [f for f in os.listdir(face_dir) if os.path.isdir(os.path.join(face_dir, f))]
        print(f"获取到 {len(person_folders)} 个人脸文件夹")
        
        for person in person_folders:
            person_dir = os.path.join(face_dir, person)
            try:
                image_files = [f for f in os.listdir(person_dir) 
                              if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                
                image_count = len(image_files)
                total_images += image_count
                print(f"人脸 '{person}' 包含 {image_count} 张图像")
                
                if image_files:
                    # 获取第一张图片作为预览
                    preview_image = os.path.join(person, image_files[0])
                    
                    face_info.append({
                        'name': person,
                        'image_count': image_count,
                        'preview_image': preview_image
                    })
            except Exception as e:
                print(f"处理人脸文件夹 '{person}' 时出错: {str(e)}")
        
        result = {
            'total_faces': len(person_folders),
            'total_images': total_images,
            'faces': face_info
        }
        print(f"返回人脸数据库信息: {len(face_info)} 条记录")
        return result
    
    def delete_face(self, face_name):
        """删除人脸文件夹"""
        face_dir = os.path.join(app.config['UPLOAD_FOLDER'], face_name)
        print(f"尝试删除人脸文件夹: {face_dir}")
        
        if not os.path.exists(face_dir):
            print(f"人脸文件夹不存在: {face_dir}")
            return False, f"人脸文件夹 {face_name} 不存在"
        
        try:
            # 删除文件夹中的所有文件
            for file in os.listdir(face_dir):
                file_path = os.path.join(face_dir, file)
                print(f"删除文件: {file_path}")
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            
            # 删除文件夹
            print(f"删除文件夹: {face_dir}")
            os.rmdir(face_dir)
            
            # 重新加载人脸数据库
            print("重新加载人脸数据库")
            self.load_face_database()
            
            return True, f"已删除人脸: {face_name}"
        except Exception as e:
            print(f"删除人脸时出错: {str(e)}")
            return False, f"删除人脸时出错: {str(e)}"

# 初始化人脸识别核心
face_core = None

def init_face_core():
    """初始化人脸识别核心"""
    global face_core
    try:
        face_core = FaceRecognitionCore()
        return True
    except Exception as e:
        print(f"初始化人脸识别核心错误: {e}")
        return False

# 检查文件后缀名是否允许
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# 路由 - 主页
@app.route('/')
def index():
    """主页 - 显示系统首页"""
    return render_template('index.html')

# 添加各页面的路由
@app.route('/recognition')
def recognition():
    """人脸识别页面"""
    return render_template('recognition.html')

@app.route('/enrollment')
def enrollment():
    """人脸录入页面"""
    return render_template('enrollment.html')

@app.route('/management')
def management():
    """人脸管理页面"""
    return render_template('management.html')

@app.route('/more_features')
def more_features():
    """更多功能页面"""
    return render_template('more_features.html')

# API - 识别上传的图片
@app.route('/api/recognize', methods=['POST'])
def api_recognize():
    """识别上传的图片"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        # 获取图像数据
        if 'image' in request.files:
            # 从表单获取图像文件
            file = request.files['image']
            if not file or not allowed_file(file.filename):
                return jsonify({'success': False, 'message': '无效的图像文件'})
            
            # 读取图像
            img_data = file.read()
            img_np = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        elif request.is_json:
            # 从JSON获取Base64图像数据
            data = request.get_json()
            if 'image' not in data:
                return jsonify({'success': False, 'message': '缺少图像数据'})
            
            # 解析Base64图像
            base64_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
            img_data = base64.b64decode(base64_data)
            img_np = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        else:
            return jsonify({'success': False, 'message': '未提供图像数据'})
        
        # 识别人脸
        start_time = time.time()
        results = face_core.recognize_face(img)
        recognition_time = time.time() - start_time
        
        # 增加性能信息
        performance_info = {
            'detection_time': round(recognition_time * 1000, 2),  # 毫秒
            'face_count': len(results)
        }
        
        return jsonify({
            'success': True, 
            'faces': results,
            'performance': performance_info
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'识别错误: {str(e)}'})

# API - 识别视频帧
@app.route('/api/recognize_frame', methods=['POST'])
def api_recognize_frame():
    """识别视频帧"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        # 获取图像数据
        if not request.is_json:
            return jsonify({'success': False, 'message': '数据格式错误'})
        
        data = request.get_json()
        if 'image' not in data:
            return jsonify({'success': False, 'message': '缺少图像数据'})
        
        # 解析Base64图像
        base64_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        img_data = base64.b64decode(base64_data)
        img_np = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'success': False, 'message': '无法解码图像数据'})
        
        # 识别人脸
        start_time = time.time()
        results = face_core.recognize_face(img)
        recognition_time = time.time() - start_time
        
        # 在图像上绘制结果
        img_with_rect = face_core.draw_face_rects(img, results)
        
        # 将结果图像编码为Base64
        _, buffer = cv2.imencode('.jpg', img_with_rect)
        img_b64 = base64.b64encode(buffer).decode('utf-8')
        
        # 增加性能信息
        performance_info = {
            'detection_time': round(recognition_time * 1000, 2),  # 毫秒
            'face_count': len(results)
        }
        
        return jsonify({
            'success': True, 
            'image_b64': img_b64, 
            'count': len(results),
            'faces': results,
            'performance': performance_info
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'识别错误: {str(e)}'})

# API - 创建人脸文件夹
@app.route('/api/create_face', methods=['POST'])
def api_create_face():
    """创建人脸文件夹"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        data = request.get_json()
        if 'face_name' not in data or not data['face_name'].strip():
            return jsonify({'success': False, 'message': '缺少人脸名称'})
        
        face_name = data['face_name'].strip()
        
        # 创建人脸文件夹
        success, message = face_core.create_face_folder(face_name)
        
        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'创建人脸文件夹错误: {str(e)}'})

# API - 添加人脸图像
@app.route('/api/add_face_image', methods=['POST'])
def api_add_face_image():
    """添加人脸图像"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        # 获取人脸名称
        face_name = request.form.get('face_name')
        if not face_name:
            return jsonify({'success': False, 'message': '缺少人脸名称'})
        
        # 获取图像文件
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': '缺少图像文件'})
        
        file = request.files['image']
        if not file or not allowed_file(file.filename):
            return jsonify({'success': False, 'message': '无效的图像文件'})
        
        # 读取图像数据
        img_data = file.read()
        
        # 检查是否包含人脸
        img_np = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'success': False, 'message': '无法解码图像数据'})
        
        faces = face_core.detector(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if len(faces) == 0:
            return jsonify({'success': False, 'message': '未检测到人脸'})
        
        # 添加到数据库
        success, message = face_core.add_face_image(face_name, img_data)
        
        # 重新加载人脸数据库
        if success:
            face_core.load_face_database()
        
        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'添加人脸图像错误: {str(e)}'})

# API - 从摄像头/Base64添加人脸
@app.route('/api/add_face_from_camera', methods=['POST'])
def api_add_face_from_camera():
    """从摄像头或Base64图像添加人脸"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        # 获取JSON数据
        data = request.get_json()
        if 'face_name' not in data:
            return jsonify({'success': False, 'message': '缺少人脸名称'})
        
        if 'image_data' not in data:
            return jsonify({'success': False, 'message': '缺少图像数据'})
        
        face_name = data['face_name']
        
        # 解析Base64图像
        base64_data = data['image_data'].split(',')[1] if ',' in data['image_data'] else data['image_data']
        img_data = base64.b64decode(base64_data)
        
        # 检查是否包含人脸
        img_np = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'success': False, 'message': '无法解码图像数据'})
        
        faces = face_core.detector(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if len(faces) == 0:
            return jsonify({'success': False, 'message': '未检测到人脸'})
        
        # 添加到数据库
        success, message = face_core.add_face_image(face_name, img_data)
        
        # 重新加载人脸数据库
        if success:
            face_core.load_face_database()
        
        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'添加人脸图像错误: {str(e)}'})

# API - 获取人脸数据库信息
@app.route('/api/get_face_database', methods=['GET'])
def api_get_face_database():
    """获取人脸数据库信息"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        # 获取数据库信息
        db_info = face_core.get_face_database_info()
        
        # 添加系统信息
        system_info = {
            'model_loaded': True,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        
        return jsonify({'success': True, **db_info, 'system': system_info})
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取数据库信息错误: {str(e)}'})

# API - 删除人脸
@app.route('/api/delete_face', methods=['POST'])
def api_delete_face():
    """删除人脸"""
    if not face_core:
        return jsonify({'success': False, 'message': '人脸识别服务未初始化'})
    
    try:
        data = request.get_json()
        if 'face_name' not in data:
            return jsonify({'success': False, 'message': '缺少人脸名称'})
        
        face_name = data['face_name']
        
        # 删除人脸
        success, message = face_core.delete_face(face_name)
        
        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除人脸错误: {str(e)}'})

# 显示人脸图像
@app.route('/face_image/<path:filename>')
def face_image(filename):
    """显示人脸图像"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 应用启动
if __name__ == '__main__':
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='人脸识别Web服务')
    parser.add_argument('--port', type=int, default=8888, help='服务器端口号(默认: 8888)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='服务器主机(默认: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='是否启用调试模式')
    args = parser.parse_args()
    
    # 初始化人脸识别核心
    init_success = init_face_core()
    if not init_success:
        print("人脸识别服务初始化失败，程序将退出")
        sys.exit(1)
    
    # 打印启动信息
    print("\n" + "="*50)
    print(f"人脸识别服务器启动于 http://localhost:{args.port}")
    print("="*50 + "\n")
    
    # 抑制Flask警告信息 - 修复环境变量问题
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # 启动Flask应用，不使用environment来处理
    app.run(host=args.host, port=args.port, debug=args.debug) 