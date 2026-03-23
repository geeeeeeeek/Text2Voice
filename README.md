# 文本转语音在线工具

一个免费的在线文本转语音（TTS）工具，基于微软 Edge TTS 语音合成技术，支持多语言、多角色语音，可在线播放和下载 MP3 音频。

## 功能特点

- **高质量语音**：使用微软 Neural TTS 技术，生成接近真人的自然语音
- **多语言支持**：支持中文、英文、日文、韩文等语言
- **多语音角色**：每种语言提供男声/女声多个角色可选
- **参数调节**：自由调节语速（0.5x - 2.0x）和音调（-50% ~ +50%）
- **MP3 下载**：合成的音频可直接下载为 MP3 文件
- **双引擎备用**：Edge TTS 不可用时自动切换到浏览器内置 Web Speech API
- **响应式设计**：适配桌面、平板和手机等多种设备

## 效果预览

https://text2voice.cc

## 支持的语音

| 语言 | 语音名称 | 角色 | 性别 |
|------|---------|------|------|
| 中文(普通话) | zh-CN-XiaoxiaoNeural | 晓晓 | 女 |
| 中文(普通话) | zh-CN-YunxiNeural | 云希 | 男 |
| 中文(普通话) | zh-CN-XiaoyiNeural | 晓伊 | 女 |
| 中文(普通话) | zh-CN-YunjianNeural | 云健 | 男 |
| 英文(美国) | en-US-JennyNeural | Jenny | 女 |
| 英文(美国) | en-US-GuyNeural | Guy | 男 |
| 英文(英国) | en-GB-SoniaNeural | Sonia | 女 |
| 英文(英国) | en-GB-RyanNeural | Ryan | 男 |
| 日文 | ja-JP-NanamiNeural | Nanami | 女 |
| 日文 | ja-JP-KeitaNeural | Keita | 男 |
| 韩文 | ko-KR-SunHiNeural | SunHi | 女 |
| 韩文 | ko-KR-InJoonNeural | InJoon | 男 |

## 快速开始

### 1. 安装依赖

```bash
pip install flask edge-tts
```

### 2. 启动服务

```bash
python server.py
```

默认在 `http://localhost:8000` 启动，可指定端口：

```bash
python server.py 3000
```

### 3. 使用

在浏览器中打开 `http://localhost:8000`，输入文本，选择语音，点击"开始转换"即可。

## 文件结构

```
web_text2voice/
├── index.html          # 主页面
├── about.html          # 关于页面
├── privacy.html        # 隐私政策页面
├── server.py           # Flask 后端服务 
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── app.js          # 前端逻辑
└── README.md           # 项目文档
```

## 技术架构

```
浏览器 (HTML/CSS/JS)
    │
    │  POST /api/tts  {text, voice, rate, pitch}
    ▼
Flask 服务端 (server.py)
    │
    │  WebSocket (edge-tts Python 包)
    ▼
Microsoft Edge TTS 服务
    │
    │  MP3 音频数据
    ▼
浏览器播放 / 下载
```

- **前端**：HTML5 + CSS3 + 原生 JavaScript，负责界面交互和音频播放
- **后端**：Flask 提供静态文件服务和 `/api/tts` 接口
- **语音合成**：通过 `edge-tts` Python 包调用微软 Edge TTS 服务
- **备用方案**：当后端不可用时，前端自动切换到浏览器内置 Web Speech API（不支持下载）

## API 接口

### POST /api/tts

合成语音音频。

**请求体** (JSON)：

```json
{
    "text": "你好，世界",
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": "+0%",
    "pitch": "+0Hz"
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| text | string | 要合成的文本内容（必填） |
| voice | string | 语音角色名称，默认 `zh-CN-XiaoxiaoNeural` |
| rate | string | 语速，如 `+0%`、`+50%`、`-25%` |
| pitch | string | 音调，如 `+0Hz`、`+10Hz`、`-10Hz` |

**响应**：`audio/mpeg` 格式的 MP3 音频二进制数据。

**错误响应** (JSON)：

```json
{
    "error": "错误信息"
}
```

 



## 常见问题

### 点击"开始转换"没有反应

确认已通过 `python server.py` 启动后端服务，而不是直接双击 `index.html` 打开。Edge TTS 需要后端代理调用微软服务。

### 提示"切换到浏览器内置语音引擎"

说明后端服务不可用或网络无法访问微软 TTS 服务。此时会自动使用浏览器 Web Speech API 作为备用，但不支持 MP3 下载。

### 语音合成速度慢

音频合成速度取决于文本长度和网络状况。较长的文本建议分段合成。

## 注意事项

- 本工具使用微软 Edge TTS 公开接口，仅供个人学习和非商业用途
- 请勿使用合成语音进行欺诈、冒充他人或其他违法活动
- 语音服务可用性取决于微软服务状态

## 参考资料

- [文本转语音工具](https://my-web-tool-1f793.web.app/)
- [文本转语音AI工具](text2-voice.vercel.app)
