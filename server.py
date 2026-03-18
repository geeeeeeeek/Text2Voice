#!/usr/bin/env python3
"""
文本转语音在线工具 - 本地服务器
提供静态文件服务 + Edge TTS API 代理
用法: python server.py
依赖: pip install flask edge-tts
"""

import asyncio
import io
import os
import sys
import time

try:
    from flask import Flask, request, jsonify, send_from_directory
except ImportError:
    print("错误：缺少 flask 依赖包")
    print("请运行: pip install flask")
    sys.exit(1)

try:
    import edge_tts
except ImportError:
    print("错误：缺少 edge-tts 依赖包")
    print("请运行: pip install edge-tts")
    sys.exit(1)

# 静态文件目录限定为 web 子目录，防止源码等文件被访问
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

# 限制配置
MAX_TEXT_LENGTH = 1000
MAX_REQUESTS_PER_HOUR = 10

# 按 IP 记录请求时间戳
request_log = {}

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)


def check_rate_limit(ip):
    """检查指定 IP 是否超过频次限制，返回 (是否允许, 已用次数)"""
    now = time.time()
    one_hour_ago = now - 3600
    timestamps = request_log.get(ip, [])
    # 清理过期记录
    timestamps = [t for t in timestamps if t > one_hour_ago]
    request_log[ip] = timestamps
    return len(timestamps) < MAX_REQUESTS_PER_HOUR, len(timestamps)


@app.route("/api/tts", methods=["POST"])
def tts():
    data = request.get_json(silent=True)
    if not data:
        return jsonify(error="请求格式错误"), 400

    text = data.get("text", "").strip()
    voice = data.get("voice", "zh-CN-XiaoxiaoNeural")
    rate = data.get("rate", "+0%")
    pitch = data.get("pitch", "+0Hz")

    if not text:
        return jsonify(error="文本内容不能为空"), 400

    if len(text) > MAX_TEXT_LENGTH:
        return jsonify(error=f"文本内容不能超过 {MAX_TEXT_LENGTH} 字"), 400

    client_ip = request.remote_addr
    allowed, used = check_rate_limit(client_ip)
    if not allowed:
        return jsonify(error=f"已达到每小时 {MAX_REQUESTS_PER_HOUR} 次的转换限制，请稍后再试"), 429

    try:
        audio_data = asyncio.run(synthesize(text, voice, rate, pitch))
        # 合成成功后才记录一次请求
        request_log.setdefault(client_ip, []).append(time.time())
        return audio_data, 200, {"Content-Type": "audio/mpeg"}
    except Exception as e:
        print(f"TTS 合成错误: {e}")
        return jsonify(error=f"语音合成失败: {e}"), 500


async def synthesize(text, voice, rate, pitch):
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    return buffer.getvalue()


if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"无效的端口号: {sys.argv[1]}")
            sys.exit(1)

    print(f"文本转语音服务已启动")
    print(f"访问地址: http://localhost:{port}")
    print(f"按 Ctrl+C 停止服务")
    app.run(host="0.0.0.0", port=port, debug=False)
