/**
 * 梅花易数 UI 交互模块
 */

import {
  loadData, timeToHexagram, numberToHexagram,
  charToHexagram, randomHexagram,
  hourToDizhi, getDizhiName, getWuxingName,
} from './meihua-core.mjs';

import {
  renderHexagramCard, renderFortuneLevel,
} from './meihua-render.mjs';

const METHOD_TIME = 'time';
const METHOD_NUMBER = 'number';
const METHOD_CHAR = 'char';
const METHOD_RANDOM = 'random';

let currentMethod = METHOD_TIME;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function initMethodTabs() {
  $$('.mh-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mh-method-btn').forEach(b => b.classList.remove('mh-method-btn--active'));
      btn.classList.add('mh-method-btn--active');
      currentMethod = btn.dataset.method;

      $$('.mh-input-panel').forEach(p => p.classList.add('mh-hidden'));
      const panel = $(`#mh-panel-${currentMethod}`);
      if (panel) panel.classList.remove('mh-hidden');
    });
  });
}

function initDivineButton() {
  const btn = $('#mh-divine-btn');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '起卦中...';

    try {
      const result = await performDivination();
      displayResult(result);
    } catch (e) {
      console.error(e);
      $('#mh-error').textContent = e.message || '起卦出错，请重试';
      $('#mh-error').classList.remove('mh-hidden');
    }

    btn.disabled = false;
    btn.textContent = '起卦';
  });
}

async function performDivination() {
  await loadData();

  switch (currentMethod) {
    case METHOD_TIME: {
      const now = new Date();
      return timeToHexagram(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours());
    }
    case METHOD_NUMBER: {
      const n1 = parseInt($('#mh-num1').value);
      const n2 = parseInt($('#mh-num2').value);
      const n3 = parseInt($('#mh-num3').value) || 0;
      if (!n1 || !n2 || n1 < 1 || n2 < 1) throw new Error('请输入有效的正整数');
      return numberToHexagram(n1, n2, n3 || undefined);
    }
    case METHOD_CHAR: {
      const text = $('#mh-text').value.trim();
      if (!text) throw new Error('请输入文字');
      return charToHexagram(text);
    }
    case METHOD_RANDOM: {
      return await animateRandom();
    }
  }
}

async function animateRandom() {
  const btn = $('#mh-divine-btn');
  const dots = ['·', '· ·', '· · ·'];
  for (let i = 0; i < 6; i++) {
    btn.textContent = `静心凝神${dots[i % 3]}`;
    await new Promise(r => setTimeout(r, 400));
  }
  return randomHexagram();
}

function displayResult(r) {
  const resultArea = $('#mh-result');
  $('#mh-error').classList.add('mh-hidden');

  const tiSide = r.ti === r.original.upper ? 'upper' : 'lower';

  const now = new Date();
  const timeInfo = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  resultArea.innerHTML = `
    <div class="mh-result-header">
      <div class="mh-result-time">${timeInfo}</div>
      <div class="mh-result-fortune">${renderFortuneLevel(r.fortune.level)}</div>
    </div>

    <div class="mh-hexagrams-row">
      ${renderHexagramCard('本卦', r.original, r.movingLine, tiSide)}
      ${renderHexagramCard('互卦', r.mutual, 0, null)}
      ${renderHexagramCard('变卦', r.changed, 0, null)}
    </div>

    <div class="mh-analysis">
      <div class="mh-analysis__section">
        <h3>体用分析</h3>
        <div class="mh-ti-yong">
          <span class="mh-ti-label">体卦</span>
          <span class="mh-trigram-chip mh-trigram-chip--ti">${r.ti.symbol} ${r.ti.name}(${r.ti.nature}) · ${getWuxingName(r.ti.element)}</span>
          <span class="mh-relation-tag">${r.fortune.relationName}</span>
          <span class="mh-trigram-chip mh-trigram-chip--yong">${r.yong.symbol} ${r.yong.name}(${r.yong.nature}) · ${getWuxingName(r.yong.element)}</span>
          <span class="mh-yong-label">用卦</span>
        </div>
        <div class="mh-moving-info">动爻在第${r.movingLine}爻</div>
      </div>

      <div class="mh-analysis__section">
        <h3>断卦</h3>
        <ul class="mh-analysis-list">
          ${r.fortune.analysis.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>

      ${r.original.hexagram ? `
      <div class="mh-analysis__section">
        <h3>卦辞</h3>
        <blockquote class="mh-quote">${r.original.hexagram.judgment}</blockquote>
        <p class="mh-image-text">${r.original.hexagram.image}</p>
      </div>` : ''}
    </div>
  `;

  resultArea.classList.remove('mh-hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initInputValidation() {
  ['mh-num1', 'mh-num2', 'mh-num3'].forEach(id => {
    const el = $(`#${id}`);
    if (el) {
      el.addEventListener('input', () => {
        el.value = el.value.replace(/[^0-9]/g, '');
      });
    }
  });

  const textEl = $('#mh-text');
  if (textEl) {
    textEl.addEventListener('input', () => {
      const count = textEl.value.length;
      const counter = $('#mh-char-count');
      if (counter) counter.textContent = `${count} 字`;
    });
  }
}

function initTimeDisplay() {
  const now = new Date();
  const hour = now.getHours();
  const zhiNum = hourToDizhi(hour);
  const el = $('#mh-time-info');
  if (el) {
    el.textContent = `当前：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${getDizhiName(zhiNum)}时（${hour}:00）`;
  }
}

export async function init() {
  initMethodTabs();
  initDivineButton();
  initInputValidation();
  initTimeDisplay();
  loadData().catch(() => {});
}

init();
