// ===== 预定义语音列表 =====
const VOICES = {
    'zh-CN': {
        label: '中文(普通话)',
        voices: [
            { name: 'zh-CN-XiaoxiaoNeural', label: '晓晓', gender: '女' },
            { name: 'zh-CN-YunxiNeural', label: '云希', gender: '男' },
            { name: 'zh-CN-XiaoyiNeural', label: '晓伊', gender: '女' },
            { name: 'zh-CN-YunjianNeural', label: '云健', gender: '男' },
        ]
    },
    'en-US': {
        label: '英文(美国)',
        voices: [
            { name: 'en-US-JennyNeural', label: 'Jenny', gender: '女' },
            { name: 'en-US-GuyNeural', label: 'Guy', gender: '男' },
        ]
    },
    'en-GB': {
        label: '英文(英国)',
        voices: [
            { name: 'en-GB-SoniaNeural', label: 'Sonia', gender: '女' },
            { name: 'en-GB-RyanNeural', label: 'Ryan', gender: '男' },
        ]
    },
    'ja-JP': {
        label: '日文',
        voices: [
            { name: 'ja-JP-NanamiNeural', label: 'Nanami', gender: '女' },
            { name: 'ja-JP-KeitaNeural', label: 'Keita', gender: '男' },
        ]
    },
    'ko-KR': {
        label: '韩文',
        voices: [
            { name: 'ko-KR-SunHiNeural', label: 'SunHi', gender: '女' },
            { name: 'ko-KR-InJoonNeural', label: 'InJoon', gender: '男' },
        ]
    }
};

// ===== Edge TTS 服务端 API =====
const TTS_API_URL = '/api/tts';

// ===== 限制配置 =====
const MAX_TEXT_LENGTH = 1000;
const MAX_REQUESTS_PER_HOUR = 10;

// ===== 全局状态 =====
let currentAudioBlob = null;
let audioPlayer = null;
let isPlaying = false;
let currentEngine = null; // 'edge' 或 'webSpeech'

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', function () {
    audioPlayer = document.getElementById('audioPlayer');

    initLanguageSelect();
    initVoiceSelect();
    initSliders();
    initTextarea();

    audioPlayer.addEventListener('ended', function () {
        isPlaying = false;
        document.getElementById('playBtn').querySelector('.btn-text').textContent = '播放';
    });
    audioPlayer.addEventListener('play', function () {
        isPlaying = true;
        document.getElementById('playBtn').querySelector('.btn-text').textContent = '暂停';
    });
    audioPlayer.addEventListener('pause', function () {
        isPlaying = false;
        document.getElementById('playBtn').querySelector('.btn-text').textContent = '播放';
    });
});

// ===== UI 初始化 =====
function initLanguageSelect() {
    const langSelect = document.getElementById('langSelect');
    for (const [code, lang] of Object.entries(VOICES)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = lang.label;
        langSelect.appendChild(option);
    }
    langSelect.addEventListener('change', initVoiceSelect);
}

function initVoiceSelect() {
    const langCode = document.getElementById('langSelect').value;
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';
    const voices = VOICES[langCode].voices;
    for (const voice of voices) {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.label}（${voice.gender}）`;
        voiceSelect.appendChild(option);
    }
}

function initSliders() {
    const rateRange = document.getElementById('rateRange');
    const pitchRange = document.getElementById('pitchRange');
    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');

    rateRange.addEventListener('input', function () {
        rateValue.textContent = parseFloat(this.value).toFixed(1) + 'x';
    });
    pitchRange.addEventListener('input', function () {
        const val = parseInt(this.value);
        pitchValue.textContent = (val >= 0 ? '+' : '') + val + '%';
    });
}

function initTextarea() {
    const textarea = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    textarea.setAttribute('maxlength', MAX_TEXT_LENGTH);
    textarea.addEventListener('input', function () {
        const len = this.value.length;
        charCount.textContent = len;
        const counter = charCount.parentElement;
        if (len >= MAX_TEXT_LENGTH) {
            counter.classList.add('char-limit');
        } else {
            counter.classList.remove('char-limit');
        }
    });
}

// ===== 状态控制 =====
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('synthesizeBtn').disabled = true;
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('synthesizeBtn').disabled = false;
}

function showError(message) {
    const el = document.getElementById('error');
    el.textContent = message;
    el.style.display = 'block';
}

function showEngineNotice(engine) {
    const el = document.getElementById('engineNotice');
    if (engine === 'edge') {
        el.textContent = '当前引擎：Microsoft Edge TTS';
    } else {
        el.textContent = '当前引擎：浏览器内置语音（Edge TTS 不可用，已自动切换）';
    }
    el.style.display = 'block';
}

function enablePlaybackButtons() {
    document.getElementById('playBtn').disabled = false;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
}

function disablePlaybackButtons() {
    document.getElementById('playBtn').disabled = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
}

// ===== Edge TTS 服务端调用 =====
async function callEdgeTTS(text, voice, rate, pitch) {
    // 将滑块值转为 edge-tts 需要的格式
    const ratePercent = Math.round((rate - 1) * 100);
    const rateStr = (ratePercent >= 0 ? '+' : '') + ratePercent + '%';
    const pitchStr = (pitch >= 0 ? '+' : '') + pitch + 'Hz';

    const response = await fetch(TTS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            voice: voice,
            rate: rateStr,
            pitch: pitchStr
        })
    });

    if (!response.ok) {
        let message = '语音合成请求失败';
        try {
            const err = await response.json();
            message = err.error || message;
        } catch (e) { /* ignore */ }
        throw new Error(message);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
        throw new Error('未收到音频数据');
    }
    return blob;
}

// ===== Web Speech API 备用方案 =====
function synthesizeWithWebSpeech(text, voice, rate, pitch) {
    return new Promise(function (resolve, reject) {
        if (!('speechSynthesis' in window)) {
            reject(new Error('浏览器不支持语音合成'));
            return;
        }

        // Web Speech API 不产生可下载的音频，只能在线播放
        const utterance = new SpeechSynthesisUtterance(text);

        // 尝试匹配语音
        const voices = speechSynthesis.getVoices();
        const langCode = document.getElementById('langSelect').value;
        const matchedVoice = voices.find(function (v) {
            return v.lang.startsWith(langCode);
        });
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }
        utterance.lang = langCode;
        utterance.rate = rate;
        utterance.pitch = 1 + pitch / 100; // 转换为 0-2 范围

        utterance.onend = function () {
            resolve(null); // Web Speech 没有 blob
        };
        utterance.onerror = function (e) {
            reject(new Error('语音合成失败: ' + e.error));
        };

        speechSynthesis.speak(utterance);
        resolve('webSpeech'); // 立即返回标记
    });
}

// ===== 频次限制 =====
function getRequestLog() {
    try {
        return JSON.parse(localStorage.getItem('tts_requests') || '[]');
    } catch (e) {
        return [];
    }
}

function recordRequest() {
    const log = getRequestLog();
    log.push(Date.now());
    localStorage.setItem('tts_requests', JSON.stringify(log));
}

function getRecentRequestCount() {
    const oneHourAgo = Date.now() - 3600000;
    const log = getRequestLog().filter(function (ts) { return ts > oneHourAgo; });
    // 顺便清理过期记录
    localStorage.setItem('tts_requests', JSON.stringify(log));
    return log.length;
}

// ===== 主合成流程 =====
async function synthesize() {
    const text = document.getElementById('textInput').value.trim();
    if (!text) {
        showError('请输入要转换的文本内容');
        return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
        showError('文本内容不能超过 ' + MAX_TEXT_LENGTH + ' 字');
        return;
    }

    const usedCount = getRecentRequestCount();
    if (usedCount >= MAX_REQUESTS_PER_HOUR) {
        showError('已达到每小时 ' + MAX_REQUESTS_PER_HOUR + ' 次的转换限制，请稍后再试');
        return;
    }

    const voice = document.getElementById('voiceSelect').value;
    const rate = parseFloat(document.getElementById('rateRange').value);
    const pitch = parseInt(document.getElementById('pitchRange').value);

    showLoading();
    document.getElementById('error').style.display = 'none';
    document.getElementById('engineNotice').style.display = 'none';

    try {
        // 尝试 Edge TTS
        const blob = await callEdgeTTS(text, voice, rate, pitch);
        currentAudioBlob = blob;
        currentEngine = 'edge';
        recordRequest();
        showEngineNotice('edge');
        playAudioBlob(blob);
        enablePlaybackButtons();

        // 显示音频区
        document.getElementById('audioSection').style.display = 'block';
    } catch (edgeError) {
        console.warn('Edge TTS 服务端调用失败，切换到 Web Speech API:', edgeError);

        try {
            // 备用方案：Web Speech API
            currentAudioBlob = null;
            currentEngine = 'webSpeech';
            showEngineNotice('webSpeech');

            const result = await synthesizeWithWebSpeech(text, voice, rate, pitch);
            if (result === 'webSpeech') {
                recordRequest();
                // Web Speech 正在播放
                document.getElementById('stopBtn').disabled = false;
                document.getElementById('downloadBtn').disabled = true;
                document.getElementById('playBtn').disabled = true;
                document.getElementById('audioSection').style.display = 'none';
            }
        } catch (webError) {
            showError('语音合成失败：请确认已运行 python server.py 启动服务端。浏览器内置语音引擎也不可用，请尝试使用 Chrome/Edge 浏览器。');
        }
    } finally {
        hideLoading();
    }
}

// ===== 音频播放 =====
function playAudioBlob(blob) {
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    audioPlayer.play();
    isPlaying = true;
}

function togglePlay() {
    if (!audioPlayer) return;

    if (currentEngine === 'webSpeech') {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
        } else if (speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
}

function stopAudio() {
    if (currentEngine === 'webSpeech') {
        speechSynthesis.cancel();
        return;
    }

    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isPlaying = false;
        document.getElementById('playBtn').querySelector('.btn-text').textContent = '播放';
    }
}

// ===== 下载功能 =====
function downloadAudio() {
    if (!currentAudioBlob) {
        showError('没有可下载的音频文件（浏览器内置引擎不支持下载）');
        return;
    }

    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;

    // 用文本前几个字做文件名
    const text = document.getElementById('textInput').value.trim();
    const fileName = text.substring(0, 20).replace(/[^\w\u4e00-\u9fff]/g, '_') || 'tts_audio';
    a.download = fileName + '.mp3';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
