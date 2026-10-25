import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX_VOLUMES } from '../js/config/game.js';

/** Install a fake `Audio`, then import the sound module. */
async function importSound() {
  const played = [];
  const playCalls = [];
  const paused = [];
  const volumeChanges = [];
  // eslint-disable-next-line no-global-assign
  globalThis.Audio = class {
    constructor(src) {
      this.src = src;
      this.preload = 'auto';
      this.loop = false;
      this.currentTime = 0;
      this.paused = true;
      this._volume = 1.0;
      played.push(src);
    }
    set volume(v) {
      this._volume = Number(v);
      volumeChanges.push({ src: this.src, volume: this._volume });
    }
    get volume() {
      return this._volume;
    }
    play() {
      this.paused = false;
      playCalls.push(this.src);
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      paused.push(this.src);
    }
  };
  // eslint-disable-next-line no-global-assign
  const mod = await import('../js/utils/sound.js');
  return { mod, played, playCalls, paused, volumeChanges };
}

test('play passes the sfx URL to Audio', async (t) => {
  const { mod, played } = await importSound();
  await mod.play('plant.mp3');
  assert.equal(played[0], 'assets/sounds/sfx/plant.mp3');
});

test('a repeat play restarts the same track', async (t) => {
  const { mod, playCalls } = await importSound();
  await mod.play('harvest.mp3');
  await mod.play('harvest.mp3');
  assert.equal(playCalls.length, 2, 'play() is invoked for each call');
  assert.equal(playCalls[0], playCalls[1], 'the same track is restarted');
});

test('startPumpLoop plays the one-shot and is not looping', async (t) => {
  const { mod, played } = await importSound();
  await mod.startPumpLoop();
  assert.ok(!mod.isPumpLooping(), 'the pump loop is not running');
  assert.ok(
    played.includes('assets/sounds/sfx/pump_running1.mp3'),
    'plays the start sound',
  );
  assert.ok(
    !played.includes('assets/sounds/sfx/pump_running_loop.mp3'),
    'does not play the looping sound',
  );
  mod.stopPumpLoop();
});

test('startPumpLoop plays once per call', async (t) => {
  const { mod, played } = await importSound();
  const playsBefore = played.filter((s) => s.endsWith('pump_running1.mp3')).length;
  await mod.startPumpLoop();
  assert.equal(played.filter((s) => s.endsWith('pump_running1.mp3')).length, playsBefore + 1, 'plays once per call');
  await mod.startPumpLoop();
  assert.equal(played.filter((s) => s.endsWith('pump_running1.mp3')).length, playsBefore + 2, 'plays again on second call');
  mod.stopPumpLoop();
});

test('stopPumpLoop is safe when nothing plays', async (t) => {
  const { mod } = await importSound();
  // isPumpLooping always returns false since there is no loop
  assert.equal(mod.isPumpLooping(), false);
  // stopPumpLoop is a no-op and does not throw
  mod.stopPumpLoop();
  assert.equal(mod.isPumpLooping(), false);
});

test('play applies the configured SFX volume', async (t) => {
  const { mod, volumeChanges } = await importSound();
  await mod.play('click_p.mp3');
  assert.equal(
    volumeChanges.at(-1).volume,
    0.4,
    'click_p.mp3 plays at its configured low volume',
  );
});

test('play defaults to full volume for an unlisted SFX', async (t) => {
  const { mod, volumeChanges } = await importSound();
  await mod.play('buy.mp3');
  assert.equal(
    volumeChanges.at(-1).volume,
    1.0,
    'an unlisted effect plays at full volume',
  );
});

test('setSfxVolume clamps to [0, 1] and applies to a cached track', async (t) => {
  const { mod, volumeChanges } = await importSound();
  await mod.play('sell.mp3');
  volumeChanges.length = 0;

  mod.setSfxVolume('sell.mp3', 0.2);
  await mod.play('sell.mp3');
  assert.equal(volumeChanges.at(-1).volume, 0.2, 'next play is quiet');

  mod.setSfxVolume('sell.mp3', -5);
  assert.equal(SFX_VOLUMES['sell.mp3'], 0, 'negative clamps to 0');
  mod.setSfxVolume('sell.mp3', 2);
  assert.equal(SFX_VOLUMES['sell.mp3'], 1, 'above 1 clamps to 1');
});
