/* ==========================================
   countdown.js - 高精度倒计时（requestAnimationFrame + Date.now）
   ========================================== */

(function() {
  'use strict';

  /**
   * 倒计时类
   * @param {Object} options
   *   - totalSeconds: 总秒数
   *   - onTick: function(remainingSeconds, displayText) 每秒回调
   *   - onComplete: function() 倒计时结束回调
   */
  function Countdown(options) {
    this.totalMs = (options.totalSeconds || 0) * 1000;
    this.onTick = options.onTick || function() {};
    this.onComplete = options.onComplete || function() {};

    this.remainingMs = this.totalMs;
    this.running = false;
    this.paused = false;
    this.rafId = null;
    this.startTime = 0;
    this.pausedRemaining = 0;

    // Page Visibility 处理
    this._boundVisibilityHandler = this._handleVisibility.bind(this);
  }

  Countdown.prototype.start = function() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.remainingMs = this.totalMs;
    this.startTime = Date.now();

    document.addEventListener('visibilitychange', this._boundVisibilityHandler);
    this._tick();
  };

  Countdown.prototype.pause = function() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pausedRemaining = this.remainingMs;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  Countdown.prototype.resume = function() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.totalMs = this.pausedRemaining;
    this.remainingMs = this.pausedRemaining;
    this.startTime = Date.now();
    this._tick();
  };

  Countdown.prototype.toggle = function() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.paused; // 返回当前暂停状态
  };

  Countdown.prototype.cancel = function() {
    this.running = false;
    this.paused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this._boundVisibilityHandler);
  };

  Countdown.prototype._tick = function() {
    if (!this.running || this.paused) return;

    var self = this;
    var elapsed = Date.now() - this.startTime;
    this.remainingMs = Math.max(0, this.totalMs - elapsed);

    var remainingSec = Math.ceil(this.remainingMs / 1000);
    var displayText = this._formatTime(remainingSec);

    this.onTick(remainingSec, displayText);

    if (this.remainingMs <= 0) {
      this.running = false;
      this.onTick(0, '00:00');
      document.removeEventListener('visibilitychange', this._boundVisibilityHandler);
      this.onComplete();
      return;
    }

    this.rafId = requestAnimationFrame(function() {
      self._tick();
    });
  };

  Countdown.prototype._handleVisibility = function() {
    if (document.hidden) {
      // 页面隐藏时不做特殊处理，继续依靠 Date.now() 差值的帧循环
      // 因为 _tick 中用 Date.now() 计算剩余时间，自动适应
    } else {
      // 页面恢复可见时，重新校准
      if (this.running && !this.paused) {
        var elapsed = Date.now() - this.startTime;
        this.remainingMs = Math.max(0, this.totalMs - elapsed);
      }
    }
  };

  Countdown.prototype._formatTime = function(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  // 暴露到全局
  window.AppCountdown = Countdown;

})();
