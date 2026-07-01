/* ==========================================
   audio.js - 铃声生成与播放（Web Audio API）
   ========================================== */

(function() {
  'use strict';

  var audioCtx = null;
  var currentGain = null;
  var isPlaying = false;
  var intervalId = null;

  /**
   * 初始化 AudioContext（必须在用户手势后调用）
   */
  function init() {
    if (!audioCtx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * 播放铃声 - 循环直到 stop() 被调用
   */
  function play(type) {
    init();
    if (!audioCtx) return;
    stop();

    isPlaying = true;

    if (type === 'silent') return;

    var pattern = getPattern(type);
    if (!pattern) return;

    // 一个完整周期时长（秒）
    var cycleDuration = pattern.reduce(function(sum, n) { return sum + n.dur + n.gap; }, 0);

    currentGain = audioCtx.createGain();
    currentGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    currentGain.connect(audioCtx.destination);

    // 下一批音符的起始时间戳
    var nextTime = audioCtx.currentTime;

    function playToneWithGain(freq, dur, startTime, gainVal) {
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(gainVal, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.connect(g);
      g.connect(currentGain);
      osc.start(startTime);
      osc.stop(startTime + dur);
    }

    /**
     * 调度两轮完整周期，然后递归调用自身以持续补充缓冲区
     * 使用 setTimeout（而非 setInterval）避免累积偏移
     */
    function scheduleBuffer() {
      if (!isPlaying) return;

      // 一次性调度 2 个完整周期，确保无缝衔接
      for (var cycle = 0; cycle < 2; cycle++) {
        for (var i = 0; i < pattern.length; i++) {
          var p = pattern[i];
          playToneWithGain(p.freq, p.dur, nextTime, p.vol || 0.6);
          nextTime += p.dur + p.gap;
        }
      }

      // 在缓冲区耗尽前（80% 处）再次调度
      intervalId = setTimeout(scheduleBuffer, cycleDuration * 1000 * 2 * 0.8);
    }

    scheduleBuffer();
  }

  /**
   * 停止播放
   */
  function stop() {
    isPlaying = false;
    if (intervalId) {
      clearTimeout(intervalId);
      intervalId = null;
    }
    if (currentGain) {
      try { currentGain.disconnect(); } catch(e) {}
      currentGain = null;
    }
  }

  /**
   * 获取不同铃声的音符模式
   * 每个音符: { freq: 频率Hz, dur: 持续时间秒, gap: 间隔秒, vol: 音量0-1 }
   */
  function getPattern(type) {
    switch (type) {
      case 'iphone':
        return [
          { freq: 988, dur: 0.15, gap: 0.05, vol: 0.5 },
          { freq: 1319, dur: 0.15, gap: 0.05, vol: 0.5 },
          { freq: 1175, dur: 0.15, gap: 0.05, vol: 0.5 },
          { freq: 988, dur: 0.15, gap: 0.15, vol: 0.5 },
          { freq: 1319, dur: 0.15, gap: 0.05, vol: 0.5 },
          { freq: 1480, dur: 0.15, gap: 0.05, vol: 0.5 },
          { freq: 1319, dur: 0.15, gap: 0.15, vol: 0.5 },
          { freq: 988, dur: 0.15, gap: 0.05, vol: 0.5 },
        ];

      case 'huawei':
        return [
          { freq: 784, dur: 0.2, gap: 0.08, vol: 0.5 },
          { freq: 988, dur: 0.2, gap: 0.08, vol: 0.5 },
          { freq: 784, dur: 0.2, gap: 0.2, vol: 0.5 },
          { freq: 988, dur: 0.2, gap: 0.08, vol: 0.5 },
          { freq: 1175, dur: 0.2, gap: 0.08, vol: 0.5 },
          { freq: 988, dur: 0.2, gap: 0.2, vol: 0.5 },
        ];

      case 'xiaomi':
        return [
          { freq: 659, dur: 0.12, gap: 0.06, vol: 0.45 },
          { freq: 784, dur: 0.12, gap: 0.06, vol: 0.45 },
          { freq: 880, dur: 0.12, gap: 0.06, vol: 0.45 },
          { freq: 1047, dur: 0.2, gap: 0.2, vol: 0.5 },
          { freq: 880, dur: 0.12, gap: 0.06, vol: 0.45 },
          { freq: 784, dur: 0.12, gap: 0.06, vol: 0.45 },
          { freq: 659, dur: 0.3, gap: 0.3, vol: 0.5 },
        ];

      case 'wechat':
        return [
          { freq: 1047, dur: 0.25, gap: 0.15, vol: 0.5 },
          { freq: 1319, dur: 0.25, gap: 0.15, vol: 0.5 },
          { freq: 1175, dur: 0.25, gap: 0.3, vol: 0.5 },
          { freq: 1319, dur: 0.25, gap: 0.15, vol: 0.5 },
          { freq: 1047, dur: 0.25, gap: 0.3, vol: 0.5 },
        ];

      default:
        return null;
    }
  }

  function isAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  window.AppAudio = {
    init: init,
    play: play,
    stop: stop,
    isAudioSupported: isAudioSupported
  };

})();
