// The API key is NOT stored in this file.
// - On Netlify: it lives in the OPENWEATHER_API_KEY environment variable and is used by
//   netlify/functions/weather.js.
// - Locally (opening index.html): copy config.example.js to config.js and add your key.
const LOCAL_KEY = window.LOCAL_API_KEY || '';

const form = document.getElementById('weather-form');
const locationInput = document.getElementById('location-input');
const message = document.getElementById('message');
const weatherContainer = document.getElementById('weather-container');
const presetButtons = document.querySelectorAll('.preset-btn');

const canTilt = window.matchMedia('(hover: hover)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let cities = [];
let messageTimer;
let renderId = 0;

/* ---------- Storage ---------- */
function loadSavedCities() {
  try {
    const saved = JSON.parse(localStorage.getItem('worldWeatherCities'));
    if (Array.isArray(saved)) cities = saved;
  } catch (e) { /* ignore corrupted / blocked storage */ }
  displayAllWeather();
}

function saveCities() {
  try { localStorage.setItem('worldWeatherCities', JSON.stringify(cities)); } catch (e) { /* ignore */ }
}

/* ---------- UI helpers ---------- */
function setMessage(text, isError = false) {
  clearTimeout(messageTimer);
  message.textContent = text;
  message.style.color = isError ? '#ff9ea0' : '#a8e0ff';
  messageTimer = setTimeout(() => { message.textContent = ''; }, 3500);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function removeCity(query) {
  cities = cities.filter((c) => c !== query);
  saveCities();
  displayAllWeather();
}

/* ---------- Time ---------- */
function convertLocalTime(timezoneOffset) {
  const local = new Date(Date.now() + timezoneOffset * 1000);
  return local.toLocaleString('en-US', {
    weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'UTC'
  });
}

// Tick every card's clock once per second
setInterval(() => {
  document.querySelectorAll('.time[data-offset]').forEach((el) => {
    el.textContent = '🕒 ' + convertLocalTime(Number(el.dataset.offset));
  });
}, 1000);

/* ---------- Weather mood (colors + icon) ---------- */
function getMood(data) {
  const main = data.weather[0].main;
  const isNight = data.weather[0].icon.endsWith('n');
  if (main === 'Thunderstorm') return { mood: 'storm', icon: '⛈️', hex: 0xb48cff };
  if (main === 'Drizzle' || main === 'Rain') return { mood: 'rain', icon: '🌧️', hex: 0x5aa9ff };
  if (main === 'Snow') return { mood: 'snow', icon: '❄️', hex: 0xcfeaff };
  if (main === 'Clear') return isNight
    ? { mood: 'clear-night', icon: '🌙', hex: 0x8f9bff }
    : { mood: 'clear-day', icon: '☀️', hex: 0xffc857 };
  if (main === 'Clouds') return { mood: 'clouds', icon: isNight ? '☁️' : '⛅', hex: 0x9db8e0 };
  return { mood: 'mist', icon: '🌫️', hex: 0xaebbd0 };
}

/* ---------- API ---------- */
async function fetchWeather(query) {
  const q = encodeURIComponent(query);
  // Local testing with your own key, otherwise use the secure Netlify function
  const url = LOCAL_KEY
    ? `https://api.openweathermap.org/data/2.5/weather?q=${q}&units=metric&appid=${LOCAL_KEY}`
    : `/.netlify/functions/weather?q=${q}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return await response.json();
}

async function addCity(query) {
  const city = query.trim();
  if (!city) return;

  if (cities.some((c) => c.toLowerCase() === city.toLowerCase())) {
    setMessage('City already added!');
    return;
  }

  setMessage('Adding city...');

  try {
    const data = await fetchWeather(city);
    if (!data) throw new Error('City not found. Try "City,CountryCode".');

    cities.push(city);
    saveCities();
    await displayAllWeather();

    setMessage(`${data.name} added successfully!`);
    locationInput.value = '';
  } catch (err) {
    setMessage(err.message || 'Something went wrong', true);
  }
}

/* ---------- 3D tilt ---------- */
function attachTilt(card) {
  if (!canTilt) return;
  const MAX = 12;
  card.addEventListener('pointerenter', () => card.classList.add('is-hover'));
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((px - 0.5) * 2 * MAX).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * 2 * MAX).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  });
  card.addEventListener('pointerleave', () => {
    card.classList.remove('is-hover');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

/* ---------- Render ---------- */
function buildCard(city, data, index) {
  const { mood, icon } = getMood(data);
  const card = document.createElement('article');
  card.className = 'weather-card';
  card.dataset.mood = mood;
  card.style.setProperty('--i', index);

  card.innerHTML = `
    <div class="card-top">
      <div>
        <h2 class="city">${escapeHTML(data.name)}, ${escapeHTML(data.sys.country)}</h2>
        <p class="time" data-offset="${data.timezone}">🕒 ${convertLocalTime(data.timezone)}</p>
      </div>
      <div class="wicon" aria-hidden="true">${icon}</div>
    </div>
    <div class="temp">${Math.round(data.main.temp)}<sup>°C</sup></div>
    <p class="desc">${escapeHTML(data.weather[0].description)}</p>
    <div class="stats">
      <div class="stat"><small>Humidity</small><strong>💧 ${data.main.humidity}%</strong></div>
      <div class="stat"><small>Wind</small><strong>🌬 ${data.wind.speed} m/s</strong></div>
    </div>
    <button class="remove" type="button">Remove</button>
  `;

  card.querySelector('.remove').addEventListener('click', () => removeCity(city));
  attachTilt(card);
  return card;
}

async function displayAllWeather() {
  const myRender = ++renderId;

  if (cities.length === 0) {
    weatherContainer.innerHTML = '<p class="empty">No cities yet. Search above or tap a popular city below.</p>';
    return;
  }

  // Loading skeletons
  weatherContainer.innerHTML = cities
    .map(() => '<div class="weather-card skeleton" aria-hidden="true"></div>').join('');

  // Fetch in parallel, keep original order
  const results = await Promise.all(
    cities.map((c) => fetchWeather(c).catch(() => null))
  );
  if (myRender !== renderId) return; // a newer render started

  weatherContainer.innerHTML = '';
  let first = null;
  results.forEach((data, i) => {
    if (!data) return;
    if (!first) first = data;
    weatherContainer.appendChild(buildCard(cities[i], data, i));
  });

  if (!first) {
    weatherContainer.innerHTML = '<p class="empty">Could not load weather. Check your connection or API key.</p>';
    return;
  }
  // Tint the 3D globe to match the first city's weather
  if (window.setSceneMood) window.setSceneMood(getMood(first).hex);
}

/* ---------- Events ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  addCity(locationInput.value);
});

presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => addCity(btn.getAttribute('data-city')));
});

document.addEventListener('DOMContentLoaded', loadSavedCities);
