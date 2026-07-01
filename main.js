/* ==========================================
   main.js - 主入口：状态管理、页面路由、设置页、等待页、通话页
   ========================================== */

(function() {
  'use strict';

  // ---- 应用状态 ----
  var state = {
    callerName: '妈妈',
    callerNumber: '13800138000',
    avatarDataUrl: '',
    theme: 'ios',
    delay: 'immediate',
    customDelay: 10,
    ringtone: 'iphone'
  };

  // ---- 通话页状态 ----
  var callStartTime = 0;
  var callTimerInterval = null;
  var isCallMuted = false;
  var isSpeakerOn = false;
  var waveAnimId = null;

  // ---- 倒计时实例 ----
  var countdownInstance = null;

  // ---- DOM 缓存 ----
  var els = {};

  function cacheElements() {
    els.settings = document.getElementById('page-settings');
    els.waiting = document.getElementById('page-waiting');
    els.incoming = document.getElementById('page-incoming');
    els.call = document.getElementById('page-call');
    els.inputName = document.getElementById('input-name');
    els.inputNumber = document.getElementById('input-number');
    els.avatarArea = document.getElementById('avatar-area');
    els.avatarPreview = document.getElementById('avatar-preview');
    els.avatarPlaceholder = document.getElementById('avatar-placeholder');
    els.avatarInput = document.getElementById('avatar-input');
    els.themeGroup = document.getElementById('theme-group');
    els.delayGroup = document.getElementById('delay-group');
    els.customDelay = document.getElementById('custom-delay');
    els.ringtoneSelect = document.getElementById('ringtone-select');
    els.btnStart = document.getElementById('btn-start');
    els.countdownDisplay = document.getElementById('countdown-display');
    els.btnCancelWait = document.getElementById('btn-cancel-wait');
    els.waitingWrapper = document.querySelector('.waiting-wrapper');
    els.cancelFloat = document.getElementById('cancel-float');
    els.btnDecline = document.getElementById('btn-decline');
    els.btnAccept = document.getElementById('btn-accept');
    els.btnHangup = document.getElementById('btn-hangup');
    els.btnMute = document.getElementById('btn-mute');
    els.btnSpeaker = document.getElementById('btn-speaker');
    els.btnKeypad = document.getElementById('btn-keypad');
    els.keypadOverlay = document.getElementById('keypad-overlay');
    els.keypadDisplay = document.getElementById('keypad-display');
    els.btnKeypadClose = document.getElementById('btn-keypad-close');
    els.waveCanvas = document.getElementById('wave-canvas');
    els.callTimer = document.getElementById('call-timer');
    els.callAvatar = document.getElementById('call-avatar');
    els.callName = document.getElementById('call-name');
    els.muteIconOn = document.getElementById('mute-icon-on');
    els.muteIconOff = document.getElementById('mute-icon-off');
  }

  // ---- 页面切换 ----
  function showPage(name) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + name);
    if (target) target.classList.add('active');

    // 来电页和通话页阻止返回
    if (name === 'incoming' || name === 'call') {
      lockBackButton();
    }
  }

  function lockBackButton() {
    history.pushState({ locked: true }, '', '');
  }

  // ---- 收集设置页状态 ----
  function collectState() {
    state.callerName = els.inputName.value.trim() || '妈妈';
    state.callerNumber = els.inputNumber.value.trim() || '13800138000';
    state.avatarDataUrl = els.avatarPreview.src || '';
    state.theme = els.themeGroup.querySelector('input[name="theme"]:checked').value;
    state.delay = els.delayGroup.querySelector('input[name="delay"]:checked').value;
    state.customDelay = parseInt(els.customDelay.value) || 10;
    state.ringtone = els.ringtoneSelect.value;
  }

  // ---- 获取延迟秒数 ----
  function getDelaySeconds() {
    switch (state.delay) {
      case 'immediate': return 0;
      case '5': return 5;
      case '30': return 30;
      case 'custom': return Math.max(1, Math.min(999, state.customDelay));
      default: return 0;
    }
  }

  // ---- 开始模拟 ----
  function startSimulation() {
    collectState();

    var delaySec = getDelaySeconds();

    // 预初始化 AudioContext（需要用户手势）
    if (typeof AppAudio !== 'undefined') {
      AppAudio.init();
    }

    if (delaySec === 0) {
      // 立即来电
      if (typeof AppIncoming !== 'undefined') {
        AppIncoming.show(state);
      }
    } else {
      // 进入等待页
      showPage('waiting');
      startCountdown(delaySec);
      // 请求全屏以隐藏浏览器状态栏和导航栏
      requestFullscreen();
    }
  }

  // ---- 全屏控制 ----
  function requestFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(function() {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function() {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // ---- 倒计时 ----
  function startCountdown(seconds) {
    if (countdownInstance) {
      countdownInstance.cancel();
    }

    // 重置息屏状态
    els.waiting.classList.remove('screen-off');
    els.cancelFloat.classList.remove('show');

    countdownInstance = new AppCountdown({
      totalSeconds: seconds,
      onTick: function(remaining, displayText) {
        els.countdownDisplay.textContent = displayText;
      },
      onComplete: function() {
        // 倒计时结束，退出全屏，进入来电页
        exitFullscreen();
        if (typeof AppIncoming !== 'undefined') {
          AppIncoming.show(state);
        }
      }
    });

    countdownInstance.start();

    // 1 秒后隐藏所有内容，进入息屏状态
    setTimeout(function() {
      if (countdownInstance && countdownInstance.running) {
        els.waiting.classList.add('screen-off');
      }
    }, 1000);
  }

  // ---- 来电接听 ----
  function onAnswer() {
    showPage('call');
    startCall();
    // 退出全屏
    exitFullscreen();
  }

  function onDecline() {
    showPage('settings');
    // 恢复滚动
    document.body.style.overflow = '';
  }

  // ---- 通话页 ----
  function startCall() {
    callStartTime = Date.now();
    isCallMuted = false;
    isSpeakerOn = false;
    updateMuteUI();
    updateSpeakerUI();

    // 设置头像和姓名
    if (state.avatarDataUrl) {
      els.callAvatar.src = state.avatarDataUrl;
    } else {
      els.callAvatar.src = '';
    }
    els.callName.textContent = state.callerName;

    // 开始计时
    updateCallTimer();
    callTimerInterval = setInterval(updateCallTimer, 1000);

    // 开始波形动画
    startWaveAnimation();
  }

  function updateCallTimer() {
    var elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    var m = Math.floor(elapsed / 60);
    var s = elapsed % 60;
    els.callTimer.textContent =
      (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function stopCall() {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }
    if (waveAnimId) {
      cancelAnimationFrame(waveAnimId);
      waveAnimId = null;
    }
  }

  function hangup() {
    stopCall();
    showPage('settings');
  }

  function toggleMute() {
    isCallMuted = !isCallMuted;
    updateMuteUI();
  }

  function updateMuteUI() {
    var ctrl = els.btnMute.querySelector('.btn-call-ctrl');
    if (isCallMuted) {
      ctrl.classList.add('active');
      els.muteIconOn.style.display = 'none';
      els.muteIconOff.style.display = '';
      els.btnMute.querySelector('.ctrl-label').textContent = '取消静音';
    } else {
      ctrl.classList.remove('active');
      els.muteIconOn.style.display = '';
      els.muteIconOff.style.display = 'none';
      els.btnMute.querySelector('.ctrl-label').textContent = '静音';
    }
  }

  function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    updateSpeakerUI();
  }

  function updateSpeakerUI() {
    var ctrl = els.btnSpeaker.querySelector('.btn-call-ctrl');
    if (isSpeakerOn) {
      ctrl.classList.add('active');
      els.btnSpeaker.querySelector('.ctrl-label').textContent = '关闭免提';
    } else {
      ctrl.classList.remove('active');
      els.btnSpeaker.querySelector('.ctrl-label').textContent = '免提';
    }
  }

  // ---- 波形动画 ----
  function startWaveAnimation() {
    var canvas = els.waveCanvas;
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var phase = 0;

    function draw() {
      var w = canvas.width;
      var h = canvas.height;
      var dpr = window.devicePixelRatio || 1;

      ctx.clearRect(0, 0, w, h);

      phase += 0.03;

      // 画 4 条正弦波
      var colors = [
        'rgba(52,199,89,0.3)',
        'rgba(0,122,255,0.25)',
        'rgba(52,199,89,0.2)',
        'rgba(0,122,255,0.15)'
      ];

      for (var line = 0; line < 4; line++) {
        var amp = h * 0.18 * (1 - line * 0.2);
        var freq = 0.008 + line * 0.003;
        var yOffset = h / 2 + (line - 1.5) * 20;
        var color = colors[line];

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineCap = 'round';

        for (var x = 0; x <= w; x += 2) {
          var y = yOffset + Math.sin(x * freq + phase + line * 0.8) * amp;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      waveAnimId = requestAnimationFrame(draw);
    }

    draw();
  }

  // ---- 拨号键盘 ----
  function showKeypad() {
    els.keypadOverlay.style.display = 'flex';
    els.keypadDisplay.textContent = '';
  }

  function hideKeypad() {
    els.keypadOverlay.style.display = 'none';
  }

  function keypadPress(key) {
    els.keypadDisplay.textContent += key;
  }

  // ---- 设置页交互 ----
  function initSettingsPage() {
    // 头像上传
    els.avatarArea.addEventListener('click', function() {
      els.avatarInput.click();
    });

    els.avatarInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(ev) {
        els.avatarPreview.src = ev.target.result;
        els.avatarPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    // 自定义延迟输入框切换
    var delayRadios = els.delayGroup.querySelectorAll('input[name="delay"]');
    for (var i = 0; i < delayRadios.length; i++) {
      delayRadios[i].addEventListener('change', function() {
        els.customDelay.disabled = this.value !== 'custom';
        if (this.value === 'custom') {
          els.customDelay.focus();
        }
      });
    }

    // 开始按钮
    els.btnStart.addEventListener('click', startSimulation);
  }

  // ---- 等待页交互 ----
  function initWaitingPage() {
    var floatTimer = null;

    function showCancelFloat() {
      if (!els.waiting.classList.contains('screen-off')) return;
      els.cancelFloat.classList.add('show');
      clearTimeout(floatTimer);
      floatTimer = setTimeout(function() {
        els.cancelFloat.classList.remove('show');
      }, 2000);
    }

    // 息屏状态下点击屏幕显示取消按钮
    els.waiting.addEventListener('click', function(e) {
      if (els.waiting.classList.contains('screen-off')) {
        showCancelFloat();
      }
    });

    // 浮动取消按钮
    els.cancelFloat.addEventListener('click', function(e) {
      e.stopPropagation();
      if (countdownInstance) countdownInstance.cancel();
      exitFullscreen();
      showPage('settings');
    });

    // 取消按钮（息屏前可见时可用）
    els.btnCancelWait.addEventListener('click', function(e) {
      e.stopPropagation();
      if (countdownInstance) countdownInstance.cancel();
      exitFullscreen();
      showPage('settings');
    });
  }

  // ---- 来电页交互 ----
  function initIncomingPage() {
    els.btnAccept.addEventListener('click', function() {
      if (typeof AppIncoming !== 'undefined') {
        AppIncoming.answer();
      }
      onAnswer();
    });

    els.btnDecline.addEventListener('click', function() {
      if (typeof AppIncoming !== 'undefined') {
        AppIncoming.decline();
      }
      onDecline();
    });
  }

  // ---- 通话页交互 ----
  function initCallPage() {
    els.btnHangup.addEventListener('click', hangup);
    els.btnMute.addEventListener('click', toggleMute);
    els.btnSpeaker.addEventListener('click', toggleSpeaker);
    els.btnKeypad.addEventListener('click', showKeypad);
    els.btnKeypadClose.addEventListener('click', hideKeypad);

    // 拨号键盘按键
    var keys = els.keypadOverlay.querySelectorAll('.keypad-key');
    for (var i = 0; i < keys.length; i++) {
      keys[i].addEventListener('click', function() {
        keypadPress(this.getAttribute('data-key'));
      });
    }

    // 点击键盘弹窗背景关闭
    els.keypadOverlay.addEventListener('click', function(e) {
      if (e.target === els.keypadOverlay) {
        hideKeypad();
      }
    });
  }

  // ---- 历史记录拦截 ----
  function initHistoryGuard() {
    // 初始推一个历史记录
    history.pushState({ page: 'initial' }, '', '');

    window.addEventListener('popstate', function(e) {
      var currentPage = getCurrentPage();

      if (currentPage === 'incoming') {
        // 来电页禁止返回，重新推入
        history.pushState({ locked: true }, '', '');
      } else if (currentPage === 'call') {
        // 通话页禁止返回
        history.pushState({ locked: true }, '', '');
      } else if (currentPage === 'waiting') {
        // 等待页允许返回，取消倒计时
        if (countdownInstance) countdownInstance.cancel();
        exitFullscreen();
        showPage('settings');
      }
    });
  }

  function getCurrentPage() {
    if (els.settings.classList.contains('active')) return 'settings';
    if (els.waiting.classList.contains('active')) return 'waiting';
    if (els.incoming.classList.contains('active')) return 'incoming';
    if (els.call.classList.contains('active')) return 'call';
    return null;
  }

  // ---- 初始化 ----
  function init() {
    cacheElements();
    initSettingsPage();
    initWaitingPage();
    initIncomingPage();
    initCallPage();
    initHistoryGuard();

    // 等待页初始不可见
    showPage('settings');
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- 暴露到全局 ----
  window.App = {
    state: state,
    onAnswer: onAnswer,
    onDecline: onDecline,
    showPage: showPage
  };

})();
