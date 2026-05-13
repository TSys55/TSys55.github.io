/**
 * 卦象 SVG 渲染模块
 */

export function renderYao(isYang, highlight, moving) {
  const y = 0;
  const w = 60;
  const h = 8;
  const gap = 6;
  const color = highlight ? 'var(--mh-ti-color)' : moving ? 'var(--mh-moving-color)' : 'var(--mh-yao-color)';

  if (isYang) {
    return `<rect x="0" y="${y}" width="${w}" height="${h}" rx="2" fill="${color}" class="mh-yao ${moving ? 'mh-yao--moving' : ''}"/>`;
  }
  const segW = (w - gap) / 2;
  return `<rect x="0" y="${y}" width="${segW}" height="${h}" rx="2" fill="${color}" class="mh-yao ${moving ? 'mh-yao--moving' : ''}"/>`
    + `<rect x="${segW + gap}" y="${y}" width="${segW}" height="${h}" rx="2" fill="${color}" class="mh-yao ${moving ? 'mh-yao--moving' : ''}"/>`;
}

export function renderTrigram(trigram) {
  const bits = trigram.binary.split('').map(Number);
  const lines = bits.map((b, i) => {
    const isYang = b === 1;
    const y = i * 16;
    return renderYao(isYang, false, false).replace(/y="0"/g, `y="${y}"`);
  });
  return lines.join('');
}

export function renderHexagramSVG(upperTrigram, lowerTrigram, movingLine, tiSide) {
  const upperBits = upperTrigram.binary.split('').map(Number);
  const lowerBits = lowerTrigram.binary.split('').map(Number);

  const lines = [
    { isYang: upperBits[2] === 1, lineNum: 6, isUpper: true },
    { isYang: upperBits[1] === 1, lineNum: 5, isUpper: true },
    { isYang: upperBits[0] === 1, lineNum: 4, isUpper: true },
    { isYang: lowerBits[2] === 1, lineNum: 3, isUpper: false },
    { isYang: lowerBits[1] === 1, lineNum: 2, isUpper: false },
    { isYang: lowerBits[0] === 1, lineNum: 1, isUpper: false },
  ];

  const svgParts = lines.map((line, i) => {
    const y = i * 16;
    const isMoving = line.lineNum === movingLine;
    const isTi = (tiSide === 'lower' && !line.isUpper) || (tiSide === 'upper' && line.isUpper);
    return renderYao(line.isYang, isTi && !isMoving, isMoving).replace(/y="0"/g, `y="${y}"`);
  });

  return `<svg class="mh-hexagram-svg" viewBox="0 0 60 88" xmlns="http://www.w3.org/2000/svg">${svgParts.join('')}</svg>`;
}

export function renderHexagramCard(label, result, movingLine, tiSide) {
  const { upper, lower, hexagram } = result;
  const svg = renderHexagramSVG(upper, lower, movingLine, tiSide);
  const hexName = hexagram ? hexagram.name : `${upper.name}${lower.name}`;
  const hexJudgment = hexagram ? hexagram.judgment : '';

  return `
    <div class="mh-card">
      <div class="mh-card__label">${label}</div>
      <div class="mh-card__trigrams">
        <span class="mh-trigram-label">${upper.symbol} ${upper.name}(${upper.nature})</span>
        ${svg}
        <span class="mh-trigram-label">${lower.symbol} ${lower.name}(${lower.nature})</span>
      </div>
      <div class="mh-card__name">${hexName}</div>
      ${hexJudgment ? `<div class="mh-card__judgment">${hexJudgment}</div>` : ''}
    </div>
  `;
}

export function renderFortuneLevel(level) {
  const map = {
    '大吉': { cls: 'mh-fortune--great', icon: '✦' },
    '吉':   { cls: 'mh-fortune--good',  icon: '◆' },
    '平':   { cls: 'mh-fortune--neutral', icon: '○' },
    '小凶': { cls: 'mh-fortune--slight',  icon: '◇' },
    '凶':   { cls: 'mh-fortune--bad',   icon: '✧' },
  };
  const info = map[level] || map['平'];
  return `<span class="mh-fortune-badge ${info.cls}">${info.icon} ${level}</span>`;
}
