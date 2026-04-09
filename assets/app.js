const Q = [
  {
    name:'Vitality', 
    r:3.8, 
    p:3.2,
    icon:'./assets/images/q-vitality.svg',
    dr:'How well the organization sustains energy and pace under prolonged pressure without burning people out.',
    dp:'Whether capacity planning, recovery cycles and wellbeing practices are structurally designed in.',
    color:'#FFAA33',
    textColor: '#0000007e'
    
  },
  {
    name:'Emotion', 
    r:4.1, 
    p:3.6,
    icon:'./assets/images/q-emotion.svg',
    dr:'How leaders and teams regulate emotional responses during conflict, failure and uncertainty.',
    dp:'Whether the organization proactively prepares for predictable emotional patterns in high-pressure phases.',
    color: '#C30615',
    textColor: '#fff'
    
  },
  {
    name:'Mind', 
    r:3.5, 
    p:3.0,
    icon:'./assets/images/q-mind.svg',
    dr:'The quality of thinking and decision-making when data is incomplete and time is short.',
    dp:'Whether scenario planning, pre-mortems and assumption-testing are built into how you operate.',
    color: '#64012D',
    textColor: '#fff'

  },
  {
    name:'Execution', 
    r:4.3, 
    p:3.9,
    icon:'./assets/images/q-execution.svg',
    dr:'How decisively and consistently the organization acts under constraint and real time pressure.',
    dp:'Whether decision rights, escalation paths and implementation briefs are defined in advance.',
    color: '#2428AB',
    textColor: '#fff'
  },
  {
    name:'Alignment', 
    r:3.6, 
    p:3.4,
    icon:'./assets/images/q-alignment.svg',
    dr:'Whether the organization stays coherent — roles, priorities, collaboration — when under stress.',
    dp:'How well the system is designed to survive personnel changes and strategic fragmentation.',
    color: '#1B74CD',
    textColor: '#0000007e'
  }
];

const SVG_NS = 'http://www.w3.org/2000/svg';
let mode = 'R';
let hovered = null;
let selected = 0;
let isAnimating = false;
let orbitOffset = 0;

const focusRatio = 0.00;
const nodeRefs = [];

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

function mod(n, m) {
  return ((n % m) + m) % m;
}
function positionNodes() {
  const { path, total } = getTrackMetrics();
  const step = total / Q.length;
  const focusDist = total * focusRatio;

  Q.forEach((q, i) => {
    const dist = ((focusDist + orbitOffset + i * step) % total + total) % total;
    const pt = path.getPointAtLength(dist);
    const ref = nodeRefs[i];

    ref.g.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);
  });
}
function shortestDelta(from, to, total) {
  let delta = ((to - from) % total + total) % total;
  if (delta > total / 2) delta -= total;
  return delta;
}

function animateOrbitTo(index) {
  const { total } = getTrackMetrics();
  const step = total / Q.length;

  const targetOffset = -index * step;
  const delta = shortestDelta(orbitOffset, targetOffset, total);
  const endOffset = orbitOffset + delta;

  gsap.to({ value: orbitOffset }, {
    value: endOffset,
    duration: 0.8,
    ease: 'power2.inOut',
    onUpdate() {
      orbitOffset = this.targets()[0].value;
      positionNodes();
    },
    onComplete() {
      orbitOffset = ((targetOffset % total) + total) % total;
      positionNodes();
    }
  });
}

function getNodeDistance(index, activeIndex, total) {
  const step = total / Q.length;
  const focusDist = total * focusRatio;
  const relativeIndex = (index - activeIndex + Q.length) % Q.length;
  return mod(focusDist + relativeIndex * step, total);
}

function initPosition() {
  const { total } = getTrackMetrics();
  const step = total / Q.length;
  currentOffset = mod(-selected * step, total);
  targetOffset = currentOffset;
  pendingSelected = selected;
}

/* function animate() {
  const { total } = getTrackMetrics();
  const diff = shortestDelta(currentOffset, targetOffset, total);

  if (Math.abs(diff) > 0.05) {
    currentOffset = mod(currentOffset + diff * 0.08, total);
    buildNodes();
  } else {
    const snapped = mod(targetOffset, total);

    if (currentOffset !== snapped || selected !== pendingSelected) {
      currentOffset = snapped;
      selected = pendingSelected;
      render();
    }
  }

  requestAnimationFrame(animate);
} */
function animateInfoChange(nextIndex) {
  const q = Q[nextIndex];
  const s = mode === 'R' ? q.r : q.p;

  const elR = document.getElementById('c-r');
  const elP = document.getElementById('c-p');
  const title = document.getElementById('info-title');
  const desc = document.getElementById('info-desc');
  const meter = document.getElementById('meter');

  const tl = gsap.timeline();

  tl.to([elR, elP, title, desc], {
    duration: 0.18,
    opacity: 0,
    y: 8,
    ease: 'power2.out'
  });

  tl.add(() => {
    elR.textContent = q.r.toFixed(1);
    elP.textContent = q.p.toFixed(1);
    title.textContent = q.name;
    desc.textContent = mode === 'R' ? q.dr : q.dp;
    meter.style.width = ((s - 1) / 4 * 100) + '%';
  });

  tl.to([elR, elP], {
    duration: 0.3,
    fill: q.color,
    ease: 'power2.out'
  }, '<');

  tl.to(title, {
    duration: 0.3,
    color: q.color,
    ease: 'power2.out'
  }, '<');

  tl.to(meter, {
    duration: 0.45,
    backgroundColor: q.color,
    width: ((s - 1) / 4 * 100) + '%',
    ease: 'power2.out'
  }, '<');

  tl.to([elR, elP, title, desc], {
    duration: 0.28,
    opacity: 1,
    y: 0,
    ease: 'power2.out'
  });

  return tl;
}
function selectQ(i) {
  if (i === selected || isAnimating) return;

  isAnimating = true;
  hovered = null;

  animateOrbitTo(i);

  const tl = gsap.timeline({
    onComplete: () => {
      selected = i;
      isAnimating = false;
      updateDots();
      updateNodeStyles();
    }
  });

  tl.add(() => layoutNodes(i, true), 0);
  tl.add(animateInfoChange(i), 0);
}

function updateNodeStyles() {
  Q.forEach((q, i) => {
    const ref = nodeRefs[i];
    const isActive = i === selected;
    const isHovered = i === hovered;

    gsap.to(ref.scoreT, {
      duration: 0.2,
      opacity: isActive ? 1 : (isHovered ? 0.85 : 0.4),
      ease: 'power2.out'
    });

    gsap.to(ref.nameT, {
      duration: 0.2,
      fill: isActive ? 'transparent' : (isHovered ? '#000000' : '#0000007e')
    });
  });
}

function initNodes() {
  const g = document.getElementById('nodes');
  g.innerHTML = '';
  nodeRefs.length = 0;

  Q.forEach((q, i) => {
    const ng = document.createElementNS(SVG_NS, 'g');
    ng.style.cursor = 'pointer';

    const hit = el('circle', {
      cx: 0,
      cy: 0,
      r: 60,
      fill: 'transparent',
      'pointer-events': 'all'
    });

    const icon = el('image', {
      href: q.icon,
      x: -40,
      y: -40,
      width: 80,
      height: 80,
      preserveAspectRatio: 'xMidYMid meet',
      'pointer-events': 'none'
    });

    const scoreT = el('text', {
      x: 0,
      y: 4,
      class: 'score-text',
      'text-anchor': 'middle',
      'font-size': '18',
      'font-family': "'Montserrat',sans-serif",
      fill: q.textColor,
      'pointer-events': 'none'
    });

    const nameT = el('text', {
      x: 0,
      y: 58,
      class: 'name-text',
      'text-anchor': 'middle',
      'font-size': '14',
      'font-weight': '500',
      'letter-spacing': '0.6',
      fill: '#0000007e',
      'font-family': "'Montserrat',sans-serif",
      'pointer-events': 'none'
    });

    scoreT.textContent = q[mode.toLowerCase()].toFixed(1);
    nameT.textContent = q.name.toUpperCase();

    ng.appendChild(hit);
    ng.appendChild(icon);
    ng.appendChild(scoreT);
    ng.appendChild(nameT);

    ng.addEventListener('mouseenter', () => {
      hovered = i;
      //updateInfo();
      updateNodeStyles();
    });

    ng.addEventListener('mouseleave', () => {
      hovered = null;
      //updateInfo();
      updateNodeStyles();
    });

    ng.addEventListener('click', () => {
      selectQ(i);
    });

    g.appendChild(ng);

    nodeRefs.push({
      g: ng,
      hit,
      icon,
      scoreT,
      nameT
    });
  });
}

function layoutNodes(activeIndex, animate = false) {
  const { path, total } = getTrackMetrics();

  Q.forEach((q, i) => {
    const dist = getNodeDistance(i, activeIndex, total);
    const pt = path.getPointAtLength(dist);
    const score = mode === 'R' ? q.r : q.p;
    const isActive = i === activeIndex;
    const isHovered = hovered === i;

    const size = isActive ? 82 : 74 + ((score - 1) / 4) * 10;
    const fontSize = isActive ? 22 : 18;
    const nameFill = isActive ? 'transparent' : (isHovered ? '#000000' : '#0000007e');
    const scoreFill = q.color;
    const ref = nodeRefs[i];

    if (animate) {
/*       gsap.to(ref.g, {
        duration: 0.75,
        ease: 'power3.inOut',
        attr: { transform: `translate(${pt.x}, ${pt.y})` }
      }); */

      gsap.to(ref.icon, {
        duration: 0.75,
        ease: 'power3.inOut',
        attr: {
          x: -size / 2,
          y: -size / 2,
          width: size,
          height: size
        }
      });

      gsap.to(ref.hit, {
        duration: 0.75,
        ease: 'power3.inOut',
        attr: { r: size / 2 + 16 }
      });

      gsap.to(ref.scoreT, {
        duration: 0.35,
        ease: 'power2.out',
        attr: {
          y: 4,
          'font-size': fontSize
        },
        fill: scoreFill,
/*         onStart: () => {
          ref.scoreT.textContent = score.toFixed(1);
        } */
      });

      gsap.to(ref.nameT, {
        duration: 0.35,
        ease: 'power2.out',
        attr: {
          y: size / 2 + 18
        },
        fill: nameFill
      });
    } else {
      ref.g.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);
      ref.icon.setAttribute('x', -size / 2);
      ref.icon.setAttribute('y', -size / 2);
      ref.icon.setAttribute('width', size);
      ref.icon.setAttribute('height', size);
      ref.hit.setAttribute('r', size / 2 + 16);
      ref.scoreT.setAttribute('font-size', fontSize);
      ref.scoreT.setAttribute('fill', scoreFill);
      /* ref.scoreT.textContent = score.toFixed(1); */
      ref.nameT.setAttribute('y', size / 2 + 18);
      ref.nameT.setAttribute('fill', nameFill);
    }
  });
}
/* function updateCentre() {
  const q = Q[selected];

  const elR = document.getElementById('c-r');
  const elP = document.getElementById('c-p');

  if (elR) {
    elR.textContent = q.r.toFixed(1);
    elR.style.fill = q.color;
  }
  if (elP) {
    elP.textContent = q.p.toFixed(1);
    elP.style.fill = q.color;
  }
} */

function updateInfo() {
  const title = document.getElementById('info-title');
  const desc = document.getElementById('info-desc');
  const meter = document.getElementById('meter');

  const index = hovered !== null ? hovered : selected;
  const q = Q[index];
  const s = mode === 'R' ? q.r : q.p;

  if (title) {
    title.textContent = q.name;
    title.style.color = q.color;
  }

  if (desc) {
    desc.textContent = mode === 'R' ? q.dr : q.dp;
    /* desc.style.color = q.color; */
  }

  if (meter) {
    meter.style.width = ((s - 1) / 4 * 100) + '%';
    meter.style.background = q.color;
  }
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
      hovered = null;
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

function initialPaint() {
  const q = Q[selected];
  const elR = document.getElementById('c-r');
  const elP = document.getElementById('c-p');
  const title = document.getElementById('info-title');
  const desc = document.getElementById('info-desc');
  const meter = document.getElementById('meter');

  elR.textContent = q.r.toFixed(1);
  elP.textContent = q.p.toFixed(1);
  elR.style.fill = q.color;
  elP.style.fill = q.color;
  title.textContent = q.name;
  title.style.color = q.color;
  desc.textContent = mode === 'R' ? q.dr : q.dp;
  meter.style.width = ((q.r - 1) / 4 * 100) + '%';
  meter.style.backgroundColor = q.color;
}

initNodes();
layoutNodes(selected, false);
initialPaint();
updateDots();
updateNodeStyles();

/* function render() {
  buildNodes();
  updateCentre();
  updateInfo();
  updateDots();
} */

function setMode(m) {
  if (mode === m) return;

  mode = m;

  document.getElementById('pill-r')?.classList.toggle('on', m === 'R');
  document.getElementById('pill-p')?.classList.toggle('on', m === 'P');

  Q.forEach((q, i) => {
    const score = m === 'R' ? q.r : q.p;
    nodeRefs[i].scoreT.textContent = score.toFixed(1);
  });

  animateInfoChange(selected);

  updateNodeStyles();
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

/* initPosition();
render();
animate(); */