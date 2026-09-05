/* Short, synthesized placeholder sound effects. No recordings, music, or external assets. */
(function (root) {
  'use strict';
  const C = root.Deadline.config;
  /** @typedef {{masterVolume: number, sfxVolume: number, muted: boolean}} AudioPreferences */
  /**
   * @typedef {Object} ActiveVoice
   * @property {AudioScheduledSourceNode} source
   * @property {AudioNode[]} nodes
   * @property {string} group
   * @property {boolean} ended
   */
  class Sound {
    constructor() {
      const saved = this.loadPreferences();
      this.context = null; this.enabled = true; this.noiseBuffer = null; this.masterGain = null; this.sfxGain = null; this.lastLockAt = -Infinity; this.lastDamageAt = -Infinity;
      this.masterVolume = saved.masterVolume; this.sfxVolume = saved.sfxVolume; this.muted = saved.muted;
      this.clockActive = false; this.nextClockAt = Infinity; this.clockStep = 0; this.activeVoices = new Set();
      this.metrics = { plays: Object.create(null), events: [], maxVoices: 0 };
    }
    /**
     * Lazily creates the Web Audio graph after a user gesture to satisfy Chrome autoplay policy.
     * @returns {void}
     */
    unlock() {
      if (!this.enabled || this.muted) return;
      try {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
          this.masterGain = this.context.createGain(); this.sfxGain = this.context.createGain();
          this.sfxGain.connect(this.masterGain); this.masterGain.connect(this.context.destination); this.applyMix();
          const length = Math.ceil(this.context.sampleRate * 0.25);
          this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
          // Seeded noise keeps the synthesized placeholder timbre repeatable across sessions and tests.
          const data = this.noiseBuffer.getChannelData(0); let seed = 0x51a7;
          for (let i = 0; i < length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1; }
        }
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      } catch (_) { this.enabled = false; }
    }
    setEnabled(enabled) {
      this.setMuted(!enabled);
    }
    /** @returns {AudioPreferences} Validated stored values or safe defaults. */
    loadPreferences() {
      const defaults = { masterVolume: C.audio.masterDefault, sfxVolume: C.audio.sfxDefault, muted: false };
      try {
        const raw = localStorage.getItem(C.audio.storageKey); if (!raw) return defaults;
        const parsed = JSON.parse(raw), valid = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
        return valid(parsed.masterVolume) && valid(parsed.sfxVolume) && typeof parsed.muted === 'boolean'
          ? { masterVolume: Number(parsed.masterVolume), sfxVolume: Number(parsed.sfxVolume), muted: parsed.muted } : defaults;
      } catch (_) { return defaults; }
    }
    savePreferences() {
      try { localStorage.setItem(C.audio.storageKey, JSON.stringify(this.preferences())); } catch (_) {}
    }
    preferences() { return { masterVolume: this.masterVolume, sfxVolume: this.sfxVolume, muted: this.muted }; }
    applyMix() {
      if (!this.context || !this.masterGain || !this.sfxGain) return;
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now); this.masterGain.gain.value = this.muted ? 0 : this.masterVolume / 100;
      this.sfxGain.gain.cancelScheduledValues(now); this.sfxGain.gain.value = this.sfxVolume / 100;
    }
    setMasterVolume(value) {
      this.masterVolume = Math.max(0, Math.min(100, Number(value) || 0)); this.applyMix(); this.savePreferences();
    }
    setSfxVolume(value) {
      this.sfxVolume = Math.max(0, Math.min(100, Number(value) || 0)); this.applyMix(); this.savePreferences();
    }
    setMuted(muted) {
      this.muted = !!muted; this.enabled = !this.muted; this.applyMix(); this.savePreferences();
      if (this.muted) { this.stopTimeClock(); this.stopAll(); } else this.unlock();
    }
    mark(name, detail = {}) {
      const at = this.context?.currentTime || 0;
      this.metrics.plays[name] = (this.metrics.plays[name] || 0) + 1;
      this.metrics.events.push({ name, at, ...detail });
      if (this.metrics.events.length > 80) this.metrics.events.splice(0, this.metrics.events.length - 80);
    }
    /**
     * Tracks every short voice so CANCEL, timeout and mute can stop it and disconnect its AudioNodes.
     * @param {AudioScheduledSourceNode} source
     * @param {AudioNode[]} nodes
     * @param {string} [group='effect']
     */
    register(source, nodes, group = 'effect') {
      const voice = { source, nodes, group, ended: false };
      const cleanup = () => {
        if (voice.ended) return; voice.ended = true; this.activeVoices.delete(voice);
        for (const node of nodes) { try { node.disconnect(); } catch (_) {} }
      };
      source.onended = cleanup; this.activeVoices.add(voice);
      this.metrics.maxVoices = Math.max(this.metrics.maxVoices, this.activeVoices.size);
    }
    stopGroup(group) {
      for (const voice of [...this.activeVoices]) if (voice.group === group) {
        try { voice.source.stop(); } catch (_) {}
        if (!voice.ended) { voice.ended = true; this.activeVoices.delete(voice); for (const node of voice.nodes) { try { node.disconnect(); } catch (_) {} } }
      }
    }
    stopAll() {
      for (const voice of [...this.activeVoices]) {
        try { voice.source.stop(); } catch (_) {}
        if (!voice.ended) { voice.ended = true; this.activeVoices.delete(voice); for (const node of voice.nodes) { try { node.disconnect(); } catch (_) {} } }
      }
    }
    /**
     * Creates one bounded oscillator voice; `register` owns cleanup after the scheduled stop.
     * @param {number} frequency
     * @param {number} duration
     * @param {OscillatorType} type
     * @param {number} gain
     * @param {number} endFrequency
     * @param {string} [group='effect']
     * @param {?number} [attack]
     * @param {?number} [release]
     */
    tone(frequency, duration, type, gain, endFrequency, group = 'effect', attack = null, release = null) {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const c = this.context, now = c.currentTime, osc = c.createOscillator(), amp = c.createGain();
      osc.type = type; osc.frequency.setValueAtTime(Math.max(20, frequency), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency || frequency), now + duration);
      const attackTime = attack ?? Math.min(0.004, duration * 0.2);
      amp.gain.setValueAtTime(0.0001, now); amp.gain.linearRampToValueAtTime(gain, now + attackTime);
      if (release) amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.18), now + Math.max(attackTime, duration - release));
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(amp); amp.connect(this.sfxGain); this.register(osc, [osc, amp], group); osc.start(now); osc.stop(now + duration + 0.008);
    }
    /**
     * Creates one filtered noise voice from the shared buffer instead of allocating sample data per sound.
     * @param {number} duration
     * @param {number} gain
     * @param {BiquadFilterType} filterType
     * @param {number} frequency
     * @param {number} endFrequency
     * @param {number} [playbackRate=1]
     * @param {string} [group='effect']
     * @param {?number} [q]
     * @param {?number} [attack]
     * @param {?number} [release]
     */
    noise(duration, gain, filterType, frequency, endFrequency, playbackRate = 1, group = 'effect', q = null, attack = null, release = null) {
      if (!this.enabled || !this.context || this.context.state !== 'running' || !this.noiseBuffer) return;
      const c = this.context, now = c.currentTime, source = c.createBufferSource(), filter = c.createBiquadFilter(), amp = c.createGain();
      source.buffer = this.noiseBuffer; source.playbackRate.value = playbackRate; filter.type = filterType; filter.Q.value = q ?? (filterType === 'bandpass' ? 1.2 : 0.55);
      filter.frequency.setValueAtTime(Math.max(30, frequency), now); filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency || frequency), now + duration);
      const attackTime = attack ?? Math.min(0.003, duration * 0.16);
      amp.gain.setValueAtTime(0.0001, now); amp.gain.linearRampToValueAtTime(gain, now + attackTime);
      if (release) amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.18), now + Math.max(attackTime, duration - release));
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter); filter.connect(amp); amp.connect(this.sfxGain); this.register(source, [source, filter, amp], group); source.start(now); source.stop(now + duration + 0.008);
    }
    playTimeStopStart() { const gain = C.feedback.combatAudio.stopVolume; this.mark('stop'); this.tone(820, 0.035, 'square', gain * 0.4, 260); this.tone(360, 0.13, 'sine', gain, 62); }
    startTimeClock() { this.stopTimeClock(); this.clockActive = true; this.clockStep = 0; this.nextClockAt = (this.context?.currentTime || 0) + C.feedback.combatAudio.tickInterval * 0.7; }
    tickInterval(remaining) {
      const audio = C.feedback.combatAudio, visual = C.feedback.timeStopVisual;
      if (remaining <= visual.finalSeconds) return audio.finalTickInterval;
      if (remaining <= visual.criticalSeconds) return audio.criticalTickInterval;
      if (remaining <= visual.warningSeconds) return audio.warningTickInterval;
      return audio.tickInterval;
    }
    /**
     * Schedules at most one tick per visual frame, avoiding a burst of queued clock sounds after a pause.
     * @param {boolean} active
     * @param {number} remaining
     */
    updateTimeClock(active, remaining) {
      if (!active) { if (this.clockActive) this.stopTimeClock(); return; }
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      if (!this.clockActive) this.startTimeClock();
      if (this.context.currentTime + 0.001 < this.nextClockAt) return;
      this.playTimeTick(remaining); this.nextClockAt = this.context.currentTime + this.tickInterval(remaining);
    }
    playTimeTick(remaining) {
      const tock = this.clockStep++ % 2 === 1, visual = C.feedback.timeStopVisual, audio = C.feedback.combatAudio;
      const urgency = remaining <= visual.finalSeconds ? audio.finalTickGainScale : remaining <= visual.criticalSeconds ? audio.criticalTickGainScale : 1;
      const gain = audio.tickVolume * urgency, duration = tock ? audio.tockDuration : audio.tickDuration;
      const filterStart = tock ? audio.tockFilterStart : audio.tickFilterStart, filterEnd = tock ? audio.tockFilterEnd : audio.tickFilterEnd, q = tock ? audio.tockFilterQ : audio.tickFilterQ;
      const release = tock ? audio.tockRelease : audio.tickRelease;
      this.mark(tock ? 'tock' : 'tick', { remaining, interval: this.tickInterval(remaining), duration, filterStart, filterEnd, q, gain, attack: audio.clockAttack, release });
      this.noise(duration, gain * (tock ? 0.84 : 0.88), 'bandpass', filterStart, filterEnd, 1, 'clock', q, audio.clockAttack, release);
      this.tone(tock ? 1450 : 2700, tock ? 0.018 : 0.015, tock ? 'triangle' : 'square', gain * (tock ? 0.3 : 0.28), tock ? 1050 : 2250, 'clock', audio.clockAttack, release * 0.72);
      this.tone(tock ? 2900 : 4800, 0.007, 'triangle', gain * (tock ? 0.06 : 0.08), tock ? 2200 : 3600, 'clock', 0.0008, 0.0035);
    }
    /** Stops and disconnects all clock voices so no tick survives CANCEL, timeout or EXECUTE. */
    stopTimeClock() { this.clockActive = false; this.nextClockAt = Infinity; this.stopGroup('clock'); }
    playTargetLock(order = 1) {
      if (!this.context || this.context.state !== 'running' || this.context.currentTime - this.lastLockAt < C.feedback.routeVisual.lockSoundMinGap) return;
      this.lastLockAt = this.context.currentTime; const gain = C.feedback.combatAudio.targetVolume;
      this.mark('target', { order }); this.tone(720 + Math.min(order, 8) * 44, 0.038, 'triangle', gain, 1040 + Math.min(order, 8) * 35); this.noise(0.022, gain * 0.22, 'bandpass', 2400, 1700);
    }
    beginExecute() { this.stopTimeClock(); this.mark('executeCommand'); }
    playExecuteRelease() {
      const gain = C.feedback.combatAudio.executeVolume; this.mark('execute');
      this.noise(0.105, gain, 'highpass', 420, 2700, 0.96, 'combat'); this.tone(120, 0.085, 'sawtooth', gain * 0.3, 760, 'combat');
    }
    playSlash(order = 1, last = false) {
      const audio = C.feedback.combatAudio, variation = 1 + Math.min(order - 1, 7) * audio.slashPitchVariation;
      const gain = audio.slashVolume * (last ? 1.08 : 1); this.mark('slash', { order, last, variation });
      this.noise(0.072, gain, 'highpass', 760 * variation, 3900 * variation, variation, 'combat'); this.tone(360 * variation, 0.052, 'triangle', gain * 0.22, 78 * variation, 'combat');
    }
    playKill(order = 1, last = false) {
      const gain = C.feedback.combatAudio.killVolume * (last ? 1.2 : 1); this.mark('kill', { order, last });
      this.tone(last ? 118 : 98, last ? 0.105 : 0.078, 'sine', gain, 38, 'combat'); this.noise(last ? 0.095 : 0.062, gain * 0.55, 'bandpass', 620, 150, 0.9, 'combat');
    }
    playTimeResume() {
      const gain = C.feedback.combatAudio.resumeVolume; this.mark('resume');
      this.tone(92, 0.09, 'sine', gain, 470); this.tone(570, 0.038, 'triangle', gain * 0.48, 920);
    }
    playDamage() {
      if (!this.context || this.context.state !== 'running' || this.context.currentTime - this.lastDamageAt < 0.09) return;
      this.lastDamageAt = this.context.currentTime; const gain = C.feedback.combatAudio.damageVolume; this.mark('damage');
      this.tone(185, 0.085, 'triangle', gain, 72, 'damage', 0.001, 0.018); this.noise(0.06, gain * 0.5, 'lowpass', 1200, 280, 1, 'damage', 0.7, 0.001, 0.012);
    }
    playUiConfirm() {
      const gain = C.feedback.combatAudio.uiVolume; this.mark('ui'); this.tone(620, 0.035, 'triangle', gain, 920, 'ui', 0.001, 0.006);
    }
    play(kind, count = 1) {
      const audio = C.feedback.combatAudio;
      if (kind === 'drawStart') { this.tone(390, 0.045, 'sine', audio.drawStartVolume, 620); this.tone(760, 0.03, 'triangle', audio.drawStartVolume * 0.56, 940); }
      else if (kind === 'draw') this.tone(440, 0.035, 'sine', audio.drawVolume, 610);
      else if (kind === 'stop') this.playTimeStopStart();
      else if (kind === 'resume') this.playTimeResume();
      else if (kind === 'lock') this.playTargetLock(count);
      else if (kind === 'execute') this.playExecuteRelease();
      else if (kind === 'hit' || kind === 'final') { this.playSlash(count, kind === 'final'); this.playKill(count, kind === 'final'); }
      else if (kind === 'clear') { this.tone(520, 0.12, 'sine', audio.clearVolume, 1040); this.tone(780, 0.16, 'triangle', audio.clearVolume * 0.7, 1300); }
      else if (kind === 'perfect') { this.tone(420, 0.16, 'sine', audio.perfectVolume, 1260); this.tone(840, 0.22, 'triangle', audio.perfectVolume * 0.83, 1680); }
      else if (kind === 'incomplete') this.tone(310, 0.1, 'triangle', audio.incompleteVolume, 180);
      else if (kind === 'fail') this.playDamage();
    }
    inspect() {
      return { enabled: this.enabled, muted: this.muted, masterVolume: this.masterVolume, sfxVolume: this.sfxVolume,
        masterGain: this.masterGain?.gain.value ?? null, sfxGain: this.sfxGain?.gain.value ?? null, contextState: this.context?.state || 'none', clockActive: this.clockActive,
        activeVoices: this.activeVoices.size, activeClockVoices: [...this.activeVoices].filter(voice => voice.group === 'clock').length,
        maxVoices: this.metrics.maxVoices, plays: { ...this.metrics.plays }, events: this.metrics.events.map(event => ({ ...event })) };
    }
  }
  root.Deadline.Sound = Sound;
})(globalThis);
