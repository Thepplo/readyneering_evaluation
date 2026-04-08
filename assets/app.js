const Q = [
  {
    name:'Vitality', r:3.8, p:3.2,
    icon:'./assets/images/q-vitality.svg',
    dr:'How well the organization sustains energy and pace under prolonged pressure without burning people out.',
    dp:'Whether capacity planning, recovery cycles and wellbeing practices are structurally designed in.'
  },
  {
    name:'Emotion', r:4.1, p:3.6,
    icon:'./assets/images/q-emotion.svg',
    dr:'How leaders and teams regulate emotional responses during conflict, failure and uncertainty.',
    dp:'Whether the organization proactively prepares for predictable emotional patterns in high-pressure phases.'
  },
  {
    name:'Mind', r:3.5, p:3.0,
    icon:'./assets/images/q-mind.svg',
    dr:'The quality of thinking and decision-making when data is incomplete and time is short.',
    dp:'Whether scenario planning, pre-mortems and assumption-testing are built into how you operate.'
  },
  {
    name:'Execution', r:4.3, p:3.9,
    icon:'./assets/images/q-execution.svg',
    dr:'How decisively and consistently the organization acts under constraint and real time pressure.',
    dp:'Whether decision rights, escalation paths and implementation briefs are defined in advance.'
  },
  {
    name:'Alignment', r:3.6, p:3.4,
    icon:'./assets/images/q-alignment.svg',
    dr:'Whether the organization stays coherent — roles, priorities, collaboration — when under stress.',
    dp:'How well the system is designed to survive personnel changes and strategic fragmentation.'
  }
];

const SVG_NS = 'http://www.w3.org/2000/svg';
let mode = 'R';
let hovered = null;
let selected = 0;

function el(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function getTrack() {
  return document.getElementById('q-track');
}

function getTrackMetrics() {
  const path = getTrack();
  return { path, total: path.getTotalLength() };
}

function getNodeDistance(index, activeIndex, total) {
  const step = total / Q.length;
  const focusRatio = 0.72;
  const focusDist = total * focusRatio;
  const relativeIndex = (index - activeIndex + Q.length) % Q.length;
  return (focusDist + relativeIndex * step) % total;
}

function buildNodes() {
  const g = document.getElementById('nodes');
  g.innerHTML = '';

  const { path, total } = getTrackMetrics();

  Q.forEach((q, i) => {
    const dist = getNodeDistance(i, selected, total);
    const pt = path.getPointAtLength(dist);
    const score = mode === 'R' ? q.r : q.p;
    const isHovered = hovered === i;
    const isActive = selected === i;
    const size = isActive ? 82 : 74 + ((score - 1) / 4) * 10;

    console.log('node', q.name, 'selected=', selected, 'x=', pt.x, 'y=', pt.y);

    const ng = document.createElementNS(SVG_NS, 'g');
    ng.style.cursor = 'pointer';
    ng.style.pointerEvents = 'all';
    ng.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);

    const icon = el('image', {
      href: q.icon,
      x: -size / 2,
      y: -size / 2,
      width: size,
      height: size,
      preserveAspectRatio: 'xMidYMid meet',
      'pointer-events': 'none'
    });

    const scoreT = el('text', {
      x: 0,
      y: 4,
      'text-anchor': 'middle',
      'font-size': isActive ? '16' : '14',
      'font-family': "'Montserrat',sans-serif",
      fill: isActive ? '#fff' : (isHovered ? '#fff' : '#c4537e'),
      'pointer-events': 'none'
    });
    scoreT.textContent = score.toFixed(1);

    const nameT = el('text', {
      x: 0,
      y: size / 2 + 18,
      'text-anchor': 'middle',
      'font-size': '14',
      'font-weight': isActive ? '700' : '500',
      'letter-spacing': '0.6',
      fill: '#770136',
      'font-family': "'Montserrat',sans-serif",
      'pointer-events': 'none'
    });
    nameT.textContent = q.name.toUpperCase();

    ng.appendChild(icon);
    ng.appendChild(scoreT);
    ng.appendChild(nameT);

    ng.addEventListener('mouseenter', () => {
      hovered = i;
      updateInfo();
      buildNodes();
    });

    ng.addEventListener('mouseleave', () => {
      hovered = null;
      updateInfo();
      buildNodes();
    });

    ng.addEventListener('click', () => {
      console.log('clicked', i, q.name);
      selected = i;
      hovered = null;
      render();
    });

    g.appendChild(ng);
  });
}

function updateCentre() {
  const avgR = Q.reduce((s, q) => s + q.r, 0) / Q.length;
  const avgP = Q.reduce((s, q) => s + q.p, 0) / Q.length;
  const elR = document.getElementById('c-r');
  if (elR) elR.textContent = avgR.toFixed(1);

  const elP = document.getElementById('c-p');
  if (elP) elP.textContent = avgP.toFixed(1);
}

function updateInfo() {
  const title = document.getElementById('info-title');
  const desc = document.getElementById('info-desc');
  const meter = document.getElementById('meter');

  const index = hovered !== null ? hovered : selected;
  const q = Q[index];
  const s = mode === 'R' ? q.r : q.p;

  if (title) title.textContent = q.name;
  if (desc) desc.textContent = mode === 'R' ? q.dr : q.dp;
  if (meter) meter.style.width = ((s - 1) / 4 * 100) + '%';
}

const dotWrap = document.getElementById('q-dots');

if (dotWrap) {
  dotWrap.innerHTML = '';
  Q.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'q-dot';
    d.innerHTML = `<span class="q-dot-tip">${q.name}</span>`;
    d.addEventListener('click', () => {
      selected = i;
      hovered = i;
      render();
    });
    dotWrap.appendChild(d);
  });
}

function updateDots() {
  if (!dotWrap) return;
  dotWrap.querySelectorAll('.q-dot').forEach((d, i) => {
    d.classList.toggle('on', i === selected);
  });
}

function render() {
  buildNodes();
  updateCentre();
  updateInfo();
  updateDots();
}

function setMode(m) {
  mode = m;
  document.getElementById('pill-r')?.classList.toggle('on', m === 'R');
  document.getElementById('pill-p')?.classList.toggle('on', m === 'P');
  render();
}

fetch('./assets/images/atom-model.svg')
  .then(res => res.text())
  .then(svg => {
    const wrap = document.getElementById('atom-svg');
    if (!wrap) return;
    wrap.innerHTML = svg;
    wrap.querySelectorAll('.pulse-path').forEach(el => {
      el.classList.add('animate-pulse-path');
    });
  });

render();