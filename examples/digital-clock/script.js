// Simple multi-timezone digital clock
const DEFAULT_ZONES = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/Los_Angeles'
];

const tzSelect = document.getElementById('tz-select');
const addBtn = document.getElementById('add-btn');
const tzInput = document.getElementById('tz-input');
const clocksEl = document.getElementById('clocks');

let zones = [];

function populateSelect() {
  // Use a compact list of common time zones. Modern browsers support Intl.supportedValuesOf('timeZone')
  const common = [
    'UTC','Europe/London','Europe/Berlin','Europe/Paris','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'Asia/Kolkata','Asia/Tokyo','Asia/Shanghai','Asia/Singapore','Australia/Sydney','Pacific/Auckland'
  ];
  common.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz; opt.textContent = tz;
    tzSelect.appendChild(opt);
  });
}

function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

function addZone(tz) {
  if (!tz) return;
  if (!isValidTimeZone(tz)) {
    alert('Invalid timezone: ' + tz);
    return;
  }
  if (zones.includes(tz)) return;
  zones.push(tz);
  renderClocks();
}

function removeZone(tz) {
  zones = zones.filter(z => z !== tz);
  renderClocks();
}

function formatTime(date, tz) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz
  }).format(date);
}

function formatDate(date, tz) {
  return new Intl.DateTimeFormat(undefined, { year:'numeric', month:'short', day:'numeric', timeZone: tz }).format(date);
}

function renderClocks() {
  clocksEl.innerHTML = '';
  zones.forEach(tz => {
    const card = document.createElement('div');
    card.className = 'clock';

    const rem = document.createElement('button');
    rem.className = 'remove';
    rem.title = 'Remove timezone';
    rem.textContent = '✕';
    rem.addEventListener('click', () => removeZone(tz));

    const tzEl = document.createElement('div');
    tzEl.className = 'tz';
    tzEl.textContent = tz;
    tzEl.prepend(rem);

    const timeEl = document.createElement('div');
    timeEl.className = 'time';
    timeEl.dataset.tz = tz;

    const dateEl = document.createElement('div');
    dateEl.className = 'date';
    dateEl.dataset.tz = tz;

    card.appendChild(tzEl);
    card.appendChild(timeEl);
    card.appendChild(dateEl);

    clocksEl.appendChild(card);
  });
  updateTimes();
}

function updateTimes() {
  const now = new Date();
  document.querySelectorAll('.time').forEach(el => {
    const tz = el.dataset.tz;
    el.textContent = formatTime(now, tz);
  });
  document.querySelectorAll('.date').forEach(el => {
    const tz = el.dataset.tz;
    el.textContent = formatDate(new Date(), tz);
  });
}

addBtn.addEventListener('click', () => {
  const selected = tzSelect.value;
  const typed = tzInput.value.trim();
  addZone(typed || selected);
  tzInput.value = '';
});

// init
populateSelect();
DEFAULT_ZONES.forEach(addZone);
setInterval(updateTimes, 1000);
