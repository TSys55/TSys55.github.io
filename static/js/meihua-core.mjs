/**
 * 梅花易数起卦引擎 — 纯函数模块，无 DOM 依赖
 * 起卦、互卦、变卦、体用、五行生克、旺衰
 */

// ─── 数据加载 ───

let _bagua = null;
let _hexagrams = null;
let _wuxing = null;

function trigramByNum(num) {
  return _bagua.find(t => t.num === num);
}

function hexagramByTrigrams(upperNum, lowerNum) {
  return _hexagrams.find(h => h.upper === upperNum && h.lower === lowerNum);
}

export async function loadData() {
  if (_bagua) return;
  const [baguaRes, hexRes, wxRes] = await Promise.all([
    fetch('/data/bagua.json'),
    fetch('/data/hexagrams.json'),
    fetch('/data/wuxing.json'),
  ]);
  _bagua = await baguaRes.json();
  _hexagrams = await hexRes.json();
  _wuxing = await wxRes.json();
}

// ─── 公历→农历（内置查找表） ───

const TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
  0x0d520,
];

function lunarMonthDays(yearData, month) {
  return (yearData & (0x10000 >> month)) ? 30 : 29;
}

function lunarYearDays(yearData) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    if (yearData & i) sum += 1;
  }
  return sum;
}

function leapMonth(yearData) {
  return yearData & 0xf;
}

function leapDays(yearData) {
  if (leapMonth(yearData)) {
    return (yearData & 0x10000) ? 30 : 29;
  }
  return 0;
}

const LUNAR_BASE_YEAR = 1900;
const LUNAR_BASE_DATE = new Date(1900, 0, 31);

export function gregorianToLunar(year, month, day) {
  const target = new Date(year, month - 1, day);
  let offset = Math.floor((target - LUNAR_BASE_DATE) / 86400000);

  let lunarYear, lunarMonth, lunarDay, isLeap = false;

  for (lunarYear = LUNAR_BASE_YEAR; lunarYear < 2101 && offset > 0; lunarYear++) {
    const yearData = LUNAR_INFO[lunarYear - LUNAR_BASE_YEAR];
    const daysInYear = lunarYearDays(yearData) + leapDays(yearData);
    offset -= daysInYear;
  }
  if (offset < 0) {
    offset += lunarYearDays(LUNAR_INFO[lunarYear - 1 - LUNAR_BASE_YEAR]) + leapDays(LUNAR_INFO[lunarYear - 1 - LUNAR_BASE_YEAR]);
    lunarYear--;
  }

  const yearData = LUNAR_INFO[lunarYear - LUNAR_BASE_YEAR];
  const leap = leapMonth(yearData);

  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      --lunarMonth;
      isLeap = true;
      offset -= leapDays(yearData);
    } else {
      offset -= lunarMonthDays(yearData, lunarMonth);
    }
    if (isLeap && lunarMonth === leap + 1) isLeap = false;
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }
  if (offset < 0) {
    offset += isLeap ? leapDays(yearData) : lunarMonthDays(yearData, --lunarMonth);
  }

  lunarDay = offset + 1;

  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
}

// ─── 时辰 ───

export function hourToDizhi(hour) {
  if (hour === 23 || hour === 0) return 1;
  return Math.floor((hour + 1) / 2) + 1;
}

export function yearToDizhi(year) {
  return ((year - 4) % 12) + 1;
}

// ─── 起卦核心 ───

export function timeToHexagram(year, month, day, hour) {
  const lunar = gregorianToLunar(year, month, day);
  const yearZhi = yearToDizhi(lunar.year);
  const hourZhi = hourToDizhi(hour);

  const sum1 = yearZhi + lunar.month + lunar.day;
  const sum2 = sum1 + hourZhi;

  const upperNum = ((sum1 - 1) % 8) + 1;
  const lowerNum = ((sum2 - 1) % 8) + 1;
  const movingLine = ((sum2 - 1) % 6) + 1;

  return buildResult(upperNum, lowerNum, movingLine, lunar.month);
}

export function numberToHexagram(num1, num2, num3) {
  const upperNum = ((num1 - 1) % 8) + 1;
  const lowerNum = ((num2 - 1) % 8) + 1;
  const movingLine = num3
    ? ((num3 - 1) % 6) + 1
    : ((num1 + num2 - 1) % 6) + 1;

  const now = new Date();
  const lunar = gregorianToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return buildResult(upperNum, lowerNum, movingLine, lunar.month);
}

export function charToHexagram(text) {
  const len = text.length;
  const half = Math.floor(len / 2);
  const firstHalf = half > 0 ? half : 1;
  const secondHalf = len - firstHalf;

  const upperNum = ((firstHalf - 1) % 8) + 1;
  const lowerNum = ((secondHalf - 1) % 8) + 1 || 1;
  const movingLine = ((len - 1) % 6) + 1;

  const now = new Date();
  const lunar = gregorianToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return buildResult(upperNum, lowerNum, movingLine, lunar.month);
}

export function randomHexagram() {
  const arr = new Uint16Array(3);
  crypto.getRandomValues(arr);
  const upperNum = (arr[0] % 8) + 1;
  const lowerNum = (arr[1] % 8) + 1;
  const movingLine = (arr[2] % 6) + 1;

  const now = new Date();
  const lunar = gregorianToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return buildResult(upperNum, lowerNum, movingLine, lunar.month);
}

// ─── 卦象变换 ───

function getMutualTrigrams(upperBin, lowerBin) {
  const bits = [
    (lowerBin >> 0) & 1,
    (lowerBin >> 1) & 1,
    (lowerBin >> 2) & 1,
    (upperBin >> 0) & 1,
    (upperBin >> 1) & 1,
    (upperBin >> 2) & 1,
  ];
  const huLower = (bits[3] << 2) | (bits[2] << 1) | bits[1];
  const huUpper = (bits[4] << 2) | (bits[3] << 1) | bits[2];
  return { huUpper, huLower };
}

function flipBit(val, bit) {
  return val ^ (1 << bit);
}

function getChangedTrigrams(upperBin, lowerBin, movingLine) {
  let uBin = upperBin, lBin = lowerBin;
  if (movingLine >= 4) {
    uBin = flipBit(uBin, movingLine - 4);
  } else {
    lBin = flipBit(lBin, movingLine - 1);
  }
  return { changedUpper: uBin, changedLower: lBin };
}

// ─── 体用分析 ───

export function getTiYong(upperTrigram, lowerTrigram, movingLine) {
  if (movingLine >= 4) {
    return { ti: lowerTrigram, yong: upperTrigram };
  }
  return { ti: upperTrigram, yong: lowerTrigram };
}

// ─── 五行分析 ───

function getWuxingRelation(from, to) {
  if (from === to) return 'same';
  if (_wuxing.generate[from] === to) return 'generate';
  if (_wuxing.control[from] === to) return 'control';
  if (_wuxing.generate[to] === from) return 'generated';
  if (_wuxing.control[to] === from) return 'controlled';
  return 'unknown';
}

function getSeasonalStrength(element, lunarMonth) {
  for (const season of Object.values(_wuxing.seasons)) {
    if (season.months.includes(lunarMonth)) {
      for (const [level, el] of Object.entries(season)) {
        if (level === 'months') continue;
        if (el === element) return level;
      }
    }
  }
  return 'resting';
}

function judgeFortune(ti, yong, mutualTi, lunarMonth) {
  const tiEl = ti.element;
  const yongEl = yong.element;
  const mutEl = mutualTi.element;

  const relation = getWuxingRelation(yongEl, tiEl);
  const tiStrength = getSeasonalStrength(tiEl, lunarMonth);
  const yongStrength = getSeasonalStrength(yongEl, lunarMonth);

  let level;
  const analysis = [];

  const strengthMap = { prosperous: '旺', supporting: '相', resting: '休', imprisoned: '囚', dead: '死' };
  const relationNames = { same: '比和', generate: '用生体', control: '用克体', generated: '体生用', controlled: '体克用' };

  analysis.push(`体卦${ti.name}(${_wuxing.elementNames[tiEl]})${strengthMap[tiStrength]}，用卦${yong.name}(${_wuxing.elementNames[yongEl]})${strengthMap[yongStrength]}`);

  switch (relation) {
    case 'same':
      level = '吉';
      analysis.push(`体用比和，同为${_wuxing.elementNames[tiEl]}，谋事可成`);
      break;
    case 'generate':
      level = '大吉';
      analysis.push(`用生体，${_wuxing.elementNames[yongEl]}生${_wuxing.elementNames[tiEl]}，事必成，有贵人相助`);
      break;
    case 'controlled':
      level = '吉';
      analysis.push(`体克用，${_wuxing.elementNames[tiEl]}克${_wuxing.elementNames[yongEl]}，经过努力可成`);
      break;
    case 'control':
      level = '凶';
      analysis.push(`用克体，${_wuxing.elementNames[yongEl]}克${_wuxing.elementNames[tiEl]}`);
      {
        const bridgeKey = `${yongEl}_${tiEl}`;
        const bridgeEl = _wuxing.bridge[bridgeKey];
        if (bridgeEl === mutEl) {
          analysis.push(`互卦有${_wuxing.elementNames[bridgeEl]}通关，凶中有救`);
          level = '小凶';
        } else if (tiStrength === 'prosperous' || tiStrength === 'supporting') {
          analysis.push(`体卦得时${strengthMap[tiStrength]}，可化解`);
          level = '小凶';
        }
      }
      break;
    case 'generated':
      level = '小凶';
      analysis.push(`体生用，${_wuxing.elementNames[tiEl]}生${_wuxing.elementNames[yongEl]}，耗损精力`);
      if (tiStrength === 'prosperous' || tiStrength === 'supporting') {
        analysis.push(`体卦${strengthMap[tiStrength]}，虽泄气尚可承受`);
        level = '平';
      }
      break;
    default:
      level = '平';
  }

  return { relation, relationName: relationNames[relation], level, prosperity: strengthMap[tiStrength], analysis };
}

// ─── 组装结果 ───

function binaryToTrigramNum(bin) {
  const binStr = bin.toString(2).padStart(3, '0');
  const tri = _bagua.find(t => t.binary === binStr);
  return tri ? tri.num : 1;
}

function buildResult(upperNum, lowerNum, movingLine, lunarMonth) {
  const upper = trigramByNum(upperNum);
  const lower = trigramByNum(lowerNum);

  const upperBin = parseInt(upper.binary, 2);
  const lowerBin = parseInt(lower.binary, 2);

  const original = hexagramByTrigrams(upperNum, lowerNum);

  const { huUpper, huLower } = getMutualTrigrams(upperBin, lowerBin);
  const huUpperNum = binaryToTrigramNum(huUpper);
  const huLowerNum = binaryToTrigramNum(huLower);
  const mutual = hexagramByTrigrams(huUpperNum, huLowerNum);

  const { changedUpper, changedLower } = getChangedTrigrams(upperBin, lowerBin, movingLine);
  const chUpperNum = binaryToTrigramNum(changedUpper);
  const chLowerNum = binaryToTrigramNum(changedLower);
  const changed = hexagramByTrigrams(chUpperNum, chLowerNum);

  const { ti, yong } = getTiYong(upper, lower, movingLine);

  const mutTiTrigram = movingLine >= 4
    ? trigramByNum(huLowerNum)
    : trigramByNum(huUpperNum);
  const fortune = judgeFortune(ti, yong, mutTiTrigram, lunarMonth);

  return {
    original: { upper, lower, hexagram: original, upperNum, lowerNum },
    mutual: { upper: trigramByNum(huUpperNum), lower: trigramByNum(huLowerNum), hexagram: mutual, upperNum: huUpperNum, lowerNum: huLowerNum },
    changed: { upper: trigramByNum(chUpperNum), lower: trigramByNum(chLowerNum), hexagram: changed, upperNum: chUpperNum, lowerNum: chLowerNum },
    movingLine,
    ti,
    yong,
    fortune,
    lunarMonth,
  };
}

// ─── 工具函数 ───

export function getGanZhi(year) {
  return TIANGAN[(year - 4) % 10] + DIZHI[(year - 4) % 12];
}

export function getDizhiName(num) {
  return DIZHI[(num - 1) % 12];
}

export function getWuxingName(element) {
  return _wuxing?.elementNames[element] || element;
}
