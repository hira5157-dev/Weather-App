# 🌍 World Weather App

A responsive weather app that shows live weather and local time for cities around the world.

## Features
- Add any city by name, or pick from popular cities (including many in Pakistan)
- Live local time for each city
- Temperature, weather description, humidity and wind speed
- Saved cities persist using `localStorage`
- Responsive layout for mobile and desktop
- 3D rotating globe background (Three.js) that reacts to mouse movement and changes color with the weather
- 3D tilt glass cards with a moving light shine, colored by weather condition
- Respects `prefers-reduced-motion`

## Tech Stack
HTML5, CSS3 (3D transforms, glassmorphism), JavaScript (ES6), [Three.js](https://threejs.org/), [OpenWeatherMap API](https://openweathermap.org/api)

## Run Locally
1. Clone the repo
   ```bash
   git clone https://github.com/<your-username>/weather-app.git
   ```
2. Open `index.html` in your browser (or use VS Code Live Server).

## Live Demo
Coming soon

## Author
Hira Sarwar

## API Key Setup
The OpenWeatherMap key is never committed.
- **Netlify:** Site configuration → Environment variables → add `OPENWEATHER_API_KEY`, then redeploy.
- **Local:** copy `config.example.js` to `config.js` and paste your key.
