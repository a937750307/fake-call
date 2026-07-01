/* ==========================================
   incoming.js - 来电页逻辑（震动、铃声、主题切换）
   ========================================== */

(function() {
  'use strict';

  var vibrateTimer = null;

  // ---- 震动模式定义 ----
  var VIBRATE_PATTERNS = {
    ios: function() {
      function pulse() {
        if (!navigator.vibrate) return;
        navigator.vibrate([180, 100, 180, 100, 180, 1200]);
      }
      pulse();
      return setInterval(pulse, 2760);
    },
    huawei: function() {
      function pulse() {
        if (!navigator.vibrate) return;
        navigator.vibrate([300, 150, 300, 150, 300, 1800]);
      }
      pulse();
      return setInterval(pulse, 4000);
    },
    xiaomi: function() {
      function pulse() {
        if (!navigator.vibrate) return;
        navigator.vibrate([150, 80, 150, 800, 150, 80, 150, 2000]);
      }
      pulse();
      return setInterval(pulse, 3480);
    },
    wechat: function() {
      function pulse() {
        if (!navigator.vibrate) return;
        navigator.vibrate([100, 200, 100, 200, 100, 200, 100, 2500]);
      }
      pulse();
      return setInterval(pulse, 3300);
    }
  };

  /**
   * 显示来电页
   */
  function show(state) {
    var page = document.getElementById('page-incoming');

    // 清除旧主题类
    page.className = page.className.replace(/theme-\w+/g, '');
    page.classList.add('theme-' + (state.theme || 'ios'));

    // 微信主题特殊处理
    var wechatBar = document.getElementById('wechat-bar');
    var wechatHint = document.getElementById('wechat-call-hint');
    if (state.theme === 'wechat') {
      if (wechatBar) wechatBar.style.display = 'flex';
      if (wechatHint) wechatHint.style.display = 'block';
    } else {
      if (wechatBar) wechatBar.style.display = 'none';
      if (wechatHint) wechatHint.style.display = 'none';
    }

    // 设置头像
    var avatar = document.getElementById('incoming-avatar');
    var avatarContainer = document.getElementById('incoming-avatar-container');
    if (state.avatarDataUrl) {
      avatar.src = state.avatarDataUrl;
      avatar.style.display = '';
      removeDefaultAvatar();
    } else {
      avatar.src = '';
      avatar.style.display = 'none';
      showDefaultAvatar(state.theme, avatarContainer, state.callerName);
    }

    // 设置姓名
    document.getElementById('incoming-name').textContent = state.callerName || '妈妈';

    // 设置号码/副标题
    var subtitle = document.getElementById('incoming-subtitle');
    if (state.theme === 'wechat') {
      subtitle.style.display = 'none';
    } else {
      subtitle.style.display = '';
      subtitle.textContent = state.callerNumber || '13800138000';
    }

    // 显示页面
    showPage('incoming');

    // 开始震动和铃声
    startVibrate(state.theme || 'ios');
    if (typeof AppAudio !== 'undefined') {
      AppAudio.play(state.ringtone || 'iphone');
    }
  }

  // ---- 接听/拒绝 ----

  function answer() {
    stopVibrate();
    if (typeof AppAudio !== 'undefined') {
      AppAudio.stop();
    }
    if (typeof App !== 'undefined' && App.onAnswer) {
      App.onAnswer();
    }
  }

  function decline() {
    stopVibrate();
    if (typeof AppAudio !== 'undefined') {
      AppAudio.stop();
    }
    if (typeof App !== 'undefined' && App.onDecline) {
      App.onDecline();
    }
  }

  // ---- 震动 ----

  function startVibrate(theme) {
    if (!navigator.vibrate) return;
    stopVibrate();
    var patternFn = VIBRATE_PATTERNS[theme] || VIBRATE_PATTERNS.ios;
    vibrateTimer = patternFn();
  }

  function stopVibrate() {
    if (vibrateTimer) {
      clearInterval(vibrateTimer);
      vibrateTimer = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  // ---- 头像 ----

  function removeDefaultAvatar() {
    var container = document.getElementById('incoming-avatar-container');
    var existing = container.querySelector('.default-avatar-svg');
    if (existing) existing.remove();
  }

  function showDefaultAvatar(theme, container, name) {
    removeDefaultAvatar();
    var initial = (name || '?').charAt(0);

    var sizes = { wechat: 112, huawei: 140, xiaomi: 136, ios: 140 };
    var radii = { wechat: 10, huawei: 18, xiaomi: 70, ios: 70 };
    var size = sizes[theme] || 140;
    var radius = radii[theme] || 70;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.classList.add('default-avatar-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    bg.setAttribute('rx', radius);
    bg.setAttribute('ry', radius);
    bg.setAttribute('fill', '#3A3A3C');
    svg.appendChild(bg);

    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', size / 2);
    text.setAttribute('y', size / 2 + 1);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', '#8E8E93');
    text.setAttribute('font-size', size * 0.4);
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    text.setAttribute('font-weight', '500');
    text.textContent = initial;
    svg.appendChild(text);

    if (container.style.position !== 'relative') {
      container.style.position = 'relative';
    }
    container.style.width = size + 'px';
    container.style.height = size + 'px';

    var avatarImg = document.getElementById('incoming-avatar');
    avatarImg.style.display = 'none';
    container.appendChild(svg);
  }

  // ---- 工具函数 ----

  function showPage(name) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + name);
    if (target) {
      target.classList.add('active');
    }
  }

  // 暴露到全局
  window.AppIncoming = {
    show: show,
    answer: answer,
    decline: decline,
    stopVibrate: stopVibrate
  };

})();
