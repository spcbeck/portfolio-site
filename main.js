/**
 * Main application module for Sean Beck's portfolio site.
 * Handles theme persistence, Suprematist kinetic parallax, Skeuomorphic audio FX,
 * and Functionalist Style mechanical microswitch audio & hardware switch interactions.
 */

// Migrate legacy 'rams' and 'aqua' theme keys and apply saved theme
let initialTheme = localStorage.getItem('theme') || 'brutalist';
if (initialTheme === 'rams') {
  initialTheme = 'functionalist';
  localStorage.setItem('theme', 'functionalist');
}
if (initialTheme === 'aqua' || initialTheme === 'skeuemorphic') {
  initialTheme = 'skeuomorphic';
  localStorage.setItem('theme', 'skeuomorphic');
}
document.documentElement.setAttribute('data-theme', initialTheme);

/**
 * Initializes theme selector dropdown and synchronization with localStorage
 */
export function initTheme() {
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    let currentTheme = localStorage.getItem('theme') || 'brutalist';
    if (currentTheme === 'rams') {
      currentTheme = 'functionalist';
      localStorage.setItem('theme', 'functionalist');
    }
    if (currentTheme === 'aqua' || currentTheme === 'skeuemorphic') {
      currentTheme = 'skeuomorphic';
      localStorage.setItem('theme', 'skeuomorphic');
    }
    themeSelect.value = currentTheme;
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

/**
 * Malevich Kinetic Parallax Engine (Differential Vector Motion)
 */
export function initParallax() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  let ticking = false;
  function updateParallax() {
    if (document.documentElement.getAttribute('data-theme') === 'suprematism') {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const beam = document.querySelector('.sup-vec-beam');
      const redBar = document.querySelector('.sup-vec-red-bar');
      const yellowWedge = document.querySelector('.sup-vec-yellow-wedge');
      const blueRect = document.querySelector('.sup-vec-blue-rect');
      const redCircle = document.querySelector('.sup-vec-red-circle');
      const cross = document.querySelector('.sup-vec-cross');

      if (beam) beam.style.transform = `translate3d(0, ${scrollY * 0.18}px, 0) rotate(24deg)`;
      if (redBar) redBar.style.transform = `translate3d(0, ${scrollY * -0.12}px, 0) rotate(-18deg)`;
      if (yellowWedge) yellowWedge.style.transform = `translate3d(0, ${scrollY * 0.28}px, 0) rotate(14deg)`;
      if (blueRect) blueRect.style.transform = `translate3d(0, ${scrollY * -0.2}px, 0) rotate(-8deg)`;
      if (redCircle) redCircle.style.transform = `translate3d(0, ${scrollY * 0.1}px, 0)`;
      if (cross) cross.style.transform = `translate3d(0, ${scrollY * -0.15}px, 0) rotate(32deg)`;
    }
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    },
    { passive: true }
  );

  // Update when theme changes
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      requestAnimationFrame(updateParallax);
    });
  }

  updateParallax();
}

/**
 * Skeuomorphic Web Audio Plink FX
 */
export function initSkeuomorphicAudio() {
  let audioCtx = null;
  function isSkeuomorphic() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'skeuomorphic' || theme === 'skeuemorphic' || theme === 'aqua';
  }

  function playAquaPlink() {
    if (!isSkeuomorphic()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1350, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  document.addEventListener('click', (e) => {
    if (!isSkeuomorphic()) return;
    if (e.target.closest('a, button, select')) {
      playAquaPlink();
    }
  });
}
export const initAquaAudio = initSkeuomorphicAudio;

/**
 * Functionalist Style Mechanical Microswitch Audio & Hardware Switch
 */
export function initBraunSwitch() {
  let audioCtx = null;
  function isFunctionalist() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'functionalist' || theme === 'rams';
  }

  function playBraunClick(freq = 620, duration = 0.032) {
    if (!isFunctionalist()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + duration);
      gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  const braunSwitch = document.getElementById('braunPowerSwitch');
  if (braunSwitch) {
    let isOn = false;
    function toggleSwitch() {
      isOn = !isOn;
      braunSwitch.classList.toggle('is-on', isOn);
      playBraunClick(isOn ? 880 : 360, 0.04);
    }
    braunSwitch.addEventListener('click', toggleSwitch);
    braunSwitch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSwitch();
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!isFunctionalist()) return;
    if (e.target.closest('a, button, select, .three-col-grid > div, .braun-switch-tray')) {
      playBraunClick(600, 0.03);
    }
  });
}

// Initialize all features once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initParallax();
    initAquaAudio();
    initBraunSwitch();
  });
} else {
  initTheme();
  initParallax();
  initAquaAudio();
  initBraunSwitch();
}
