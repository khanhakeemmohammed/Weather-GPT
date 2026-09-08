// ============================================================
// WEATHERGPT — STEP 4
// Voice + Multilingual + Hinglish + Smart Weather Assistant
// + SMART WEATHER ALERTS
// ============================================================

const API_BASE =
  "https://api.open-meteo.com/v1/forecast";

const GEO_BASE =
  "https://geocoding-api.open-meteo.com/v1/search";

let currentWeather = null;
let currentLocation = null;
let currentHistory = [];
let currentForecast = [];
let isFahrenheit = false;
let lightMode = false;

// Language
let currentLanguage = "en";

// Voice
let recognition = null;
let isListening = false;
let voiceButton = null;

// ============================================================
// ELEMENTS
// ============================================================

const locationInput = document.getElementById("locationInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");

const cityName = document.getElementById("cityName");
const currentDate = document.getElementById("currentDate");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const feelsLike = document.getElementById("feelsLike");
const weatherDescription =
  document.getElementById("weatherDescription");

const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const uv = document.getElementById("uv");
const rainChance = document.getElementById("rainChance");

const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");
const daylight = document.getElementById("daylight");

const forecastGrid =
  document.getElementById("forecastGrid");

const chatMessages =
  document.getElementById("chatMessages");

const chatInput =
  document.getElementById("chatInput");

const sendButton =
  document.getElementById("sendButton");

// ============================================================
// WEATHER CODES
// ============================================================

function weatherInfo(code) {
  const codes = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Moderate drizzle", "🌦️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Slight rain", "🌦️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Slight snow", "🌨️"],
    73: ["Moderate snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "❄️"],
    80: ["Slight rain showers", "🌦️"],
    81: ["Moderate rain showers", "🌧️"],
    82: ["Heavy rain showers", "⛈️"],
    85: ["Slight snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️"]
  };

  return codes[code] || ["Unknown", "🌤️"];
}

// ============================================================
// FORMATTERS
// ============================================================

function formatTime(timeString) {
  if (!timeString) return "--";

  const timePart = timeString.includes("T")
    ? timeString.split("T")[1]
    : timeString;

  const [hourString, minuteString] =
    timePart.split(":");

  let hour = Number(hourString);
  const minute = minuteString || "00";

  if (Number.isNaN(hour)) return "--";

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${period}`;
}

function formatDate(timezone) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone
  }).format(new Date());
}

function formatDay(dateString, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  const date =
    new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short"
  }).format(date);
}

function formatHistoryDay(dateString) {
  const date =
    new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

function convertTemperature(celsius) {
  if (
    celsius === null ||
    celsius === undefined ||
    Number.isNaN(Number(celsius))
  ) {
    return null;
  }

  if (isFahrenheit) {
    return Math.round(
      (Number(celsius) * 9) / 5 + 32
    );
  }

  return Math.round(Number(celsius));
}

function temperatureText(celsius) {
  const value =
    convertTemperature(celsius);

  if (value === null) {
    return "--";
  }

  return `${value}°`;
}

function temperatureUnit() {
  return isFahrenheit ? "°F" : "°C";
}

// ============================================================
// LOCATION SEARCH
// ============================================================

async function searchLocation(city) {
  const url =
    `${GEO_BASE}?name=${encodeURIComponent(city)}` +
    `&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Location search failed.");
  }

  const data = await response.json();

  if (
    !data.results ||
    data.results.length === 0
  ) {
    throw new Error(
      `Could not find "${city}".`
    );
  }

  return data.results[0];
}

// ============================================================
// GET WEATHER
// ============================================================

async function getWeather(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,

    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "precipitation",
      "uv_index"
    ].join(","),

    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "daylight_duration",
      "precipitation_probability_max",
      "precipitation_sum"
    ].join(","),

    timezone: "auto",

    past_days: "5",
    forecast_days: "6"
  });

  const response =
    await fetch(`${API_BASE}?${params}`);

  if (!response.ok) {
    throw new Error(
      "Weather service is unavailable."
    );
  }

  const data = await response.json();

  if (!data.current || !data.daily) {
    throw new Error(
      "Incomplete weather data received."
    );
  }

  return data;
}

// ============================================================
// HISTORY
// ============================================================

function buildHistory(data) {
  const daily = data.daily;

  if (!daily || !daily.time) {
    return [];
  }

  return daily.time
    .slice(0, 5)
    .map((date, index) => {
      const [description] =
        weatherInfo(
          daily.weather_code[index]
        );

      return {
        date,
        label: formatHistoryDay(date),
        condition: description,
        max:
          daily.temperature_2m_max[index],
        min:
          daily.temperature_2m_min[index],
        rain:
          daily.precipitation_sum?.[index] ??
          0
      };
    });
}

// ============================================================
// FORECAST
// ============================================================

function buildForecast(data) {
  const daily = data.daily;

  if (!daily || !daily.time) {
    return [];
  }

  return daily.time
    .slice(6, 11)
    .map((date, index) => {
      const realIndex = index + 6;

      const [description] =
        weatherInfo(
          daily.weather_code[realIndex]
        );

      return {
        date,
        label:
          index === 0
            ? "Tomorrow"
            : formatDay(
                date,
                index + 1
              ),
        condition: description,
        max:
          daily.temperature_2m_max[
            realIndex
          ],
        min:
          daily.temperature_2m_min[
            realIndex
          ],
        rain:
          daily.precipitation_probability_max?.[
            realIndex
          ] ?? 0,
        precipitation:
          daily.precipitation_sum?.[
            realIndex
          ] ?? 0
      };
    });
}

// ============================================================
// STEP 4 — WEATHER ALERT SYSTEM
// ============================================================

function generateWeatherAlerts(data) {
  if (!data || !data.current || !data.daily) {
    return [];
  }

  const current = data.current;
  const daily = data.daily;

  const alerts = [];

  const temperature =
    Number(current.temperature_2m);

  const windSpeed =
    Number(current.wind_speed_10m);

  const uvIndex =
    Number(current.uv_index ?? 0);

  const weatherCode =
    Number(current.weather_code);

  const todayIndex = 5;

  const rainProbability =
    Number(
      daily.precipitation_probability_max?.[
        todayIndex
      ] ?? 0
    );

  // ----------------------------------------------------------
  // THUNDERSTORM ALERT
  // ----------------------------------------------------------

  if (
    weatherCode === 95 ||
    weatherCode === 96 ||
    weatherCode === 99
  ) {
    alerts.push({
      type: "danger",
      icon: "⛈️",
      title: "Thunderstorm Alert",
      message:
        "Thunderstorm conditions are currently detected. Avoid unnecessary outdoor activities and stay in a safe place."
    });
  }

  // ----------------------------------------------------------
  // HEAVY RAIN ALERT
  // ----------------------------------------------------------

  if (
    rainProbability >= 70 ||
    weatherCode === 65 ||
    weatherCode === 82
  ) {
    alerts.push({
      type: "warning",
      icon: "🌧️",
      title: "Heavy Rain Alert",
      message:
        `There is a high chance of rain today (${rainProbability}%). Carry rain protection and take care outdoors.`
    });
  } else if (rainProbability >= 40) {
    alerts.push({
      type: "info",
      icon: "🌦️",
      title: "Rain Advisory",
      message:
        `There is a moderate chance of rain today (${rainProbability}%). Keeping an umbrella handy may help.`
    });
  }

  // ----------------------------------------------------------
  // STRONG WIND ALERT
  // ----------------------------------------------------------

  if (windSpeed >= 50) {
    alerts.push({
      type: "danger",
      icon: "💨",
      title: "Strong Wind Alert",
      message:
        `Strong winds are currently around ${Math.round(windSpeed)} km/h. Take extra care outdoors.`
    });
  } else if (windSpeed >= 35) {
    alerts.push({
      type: "warning",
      icon: "💨",
      title: "Wind Advisory",
      message:
        `Winds are relatively strong at around ${Math.round(windSpeed)} km/h.`
    });
  }

  // ----------------------------------------------------------
  // HIGH UV ALERT
  // ----------------------------------------------------------

  if (uvIndex >= 8) {
    alerts.push({
      type: "warning",
      icon: "☀️",
      title: "High UV Alert",
      message:
        `The UV index is ${Math.round(uvIndex)}. Limit prolonged exposure to direct sunlight and use sun protection outdoors.`
    });
  } else if (uvIndex >= 6) {
    alerts.push({
      type: "info",
      icon: "🌞",
      title: "UV Advisory",
      message:
        `The UV index is ${Math.round(uvIndex)}. Sun protection is recommended when outdoors for extended periods.`
    });
  }

  // ----------------------------------------------------------
  // HIGH TEMPERATURE ALERT
  // ----------------------------------------------------------

  if (temperature >= 40) {
    alerts.push({
      type: "danger",
      icon: "🔥",
      title: "Extreme Heat Alert",
      message:
        `The current temperature is ${temperatureText(temperature)}. Stay hydrated and avoid prolonged exposure to extreme heat.`
    });
  } else if (temperature >= 35) {
    alerts.push({
      type: "warning",
      icon: "🌡️",
      title: "Heat Advisory",
      message:
        `The current temperature is ${temperatureText(temperature)}. Stay hydrated and take breaks from the heat.`
    });
  }

  // ----------------------------------------------------------
  // LOW TEMPERATURE ALERT
  // ----------------------------------------------------------

  if (temperature <= 5) {
    alerts.push({
      type: "warning",
      icon: "🥶",
      title: "Cold Weather Alert",
      message:
        `The current temperature is ${temperatureText(temperature)}. Warm clothing is recommended.`
    });
  }

  // ----------------------------------------------------------
  // SNOW ALERT
  // ----------------------------------------------------------

  if (
    weatherCode === 71 ||
    weatherCode === 73 ||
    weatherCode === 75 ||
    weatherCode === 77 ||
    weatherCode === 85 ||
    weatherCode === 86
  ) {
    alerts.push({
      type: "warning",
      icon: "❄️",
      title: "Snow Advisory",
      message:
        "Snow conditions are currently detected. Take care while travelling and outdoors."
    });
  }

  return alerts;
}

// ============================================================
// ALERT TRANSLATION
// ============================================================

function translateAlert(alert) {
  if (!alert) return "";

  if (currentLanguage === "en") {
    return `${alert.icon} ${alert.title}: ${alert.message}`;
  }

  if (currentLanguage === "hi") {
    const translations = {
      "Thunderstorm Alert":
        "तूफान की चेतावनी",
      "Heavy Rain Alert":
        "भारी बारिश की चेतावनी",
      "Rain Advisory":
        "बारिश की सलाह",
      "Strong Wind Alert":
        "तेज़ हवा की चेतावनी",
      "Wind Advisory":
        "हवा की सलाह",
      "High UV Alert":
        "तेज़ UV की चेतावनी",
      "UV Advisory":
        "UV की सलाह",
      "Extreme Heat Alert":
        "अत्यधिक गर्मी की चेतावनी",
      "Heat Advisory":
        "गर्मी की सलाह",
      "Cold Weather Alert":
        "ठंडे मौसम की चेतावनी",
      "Snow Advisory":
        "बर्फबारी की सलाह"
    };

    return `${alert.icon} ${
      translations[alert.title] ||
      alert.title
    }: ${alert.message}`;
  }

  if (currentLanguage === "te") {
    const translations = {
      "Thunderstorm Alert":
        "ఉరుములతో కూడిన వర్షం హెచ్చరిక",
      "Heavy Rain Alert":
        "భారీ వర్షం హెచ్చరిక",
      "Rain Advisory":
        "వర్షం సూచన",
      "Strong Wind Alert":
        "బలమైన గాలి హెచ్చరిక",
      "Wind Advisory":
        "గాలి సూచన",
      "High UV Alert":
        "అధిక UV హెచ్చరిక",
      "UV Advisory":
        "UV సూచన",
      "Extreme Heat Alert":
        "తీవ్రమైన వేడి హెచ్చరిక",
      "Heat Advisory":
        "వేడి సూచన",
      "Cold Weather Alert":
        "చలి వాతావరణ హెచ్చరిక",
      "Snow Advisory":
        "మంచు సూచన"
    };

    return `${alert.icon} ${
      translations[alert.title] ||
      alert.title
    }: ${alert.message}`;
  }

  if (currentLanguage === "hinglish") {
    const translations = {
      "Thunderstorm Alert":
        "Thunderstorm Alert",
      "Heavy Rain Alert":
        "Heavy Rain Alert",
      "Rain Advisory":
        "Rain Advisory",
      "Strong Wind Alert":
        "Tez Hawa Alert",
      "Wind Advisory":
        "Hawa Advisory",
      "High UV Alert":
        "High UV Alert",
      "UV Advisory":
        "UV Advisory",
      "Extreme Heat Alert":
        "Extreme Heat Alert",
      "Heat Advisory":
        "Heat Advisory",
      "Cold Weather Alert":
        "Thand ka Alert",
      "Snow Advisory":
        "Snow Advisory"
    };

    return `${alert.icon} ${
      translations[alert.title] ||
      alert.title
    }: ${alert.message}`;
  }

  return `${alert.icon} ${alert.title}: ${alert.message}`;
}

// ============================================================
// DISPLAY ALERTS
// ============================================================

function displayWeatherAlerts(data) {
  const alerts = generateWeatherAlerts(data);

  let alertContainer =
    document.getElementById(
      "weatherAlerts"
    );

  if (!alertContainer) {
    alertContainer =
      document.createElement("div");

    alertContainer.id =
      "weatherAlerts";

    alertContainer.style.margin =
      "18px 0";

    alertContainer.style.display =
      "flex";

    alertContainer.style.flexDirection =
      "column";

    alertContainer.style.gap =
      "10px";

    // Put alerts before forecast if possible
    if (forecastGrid) {
      forecastGrid.parentElement.insertBefore(
        alertContainer,
        forecastGrid
      );
    } else if (weatherDescription) {
      weatherDescription.parentElement.appendChild(
        alertContainer
      );
    }
  }

  alertContainer.innerHTML = "";

  if (!alerts.length) {
    const safeBox =
      document.createElement("div");

    safeBox.style.padding =
      "14px 16px";

    safeBox.style.borderRadius =
      "14px";

    safeBox.style.background =
      "rgba(46, 204, 113, 0.12)";

    safeBox.style.border =
      "1px solid rgba(46, 204, 113, 0.25)";

    safeBox.innerHTML =
      "✅ <strong>Weather Status:</strong> No major weather alerts detected right now.";

    alertContainer.appendChild(
      safeBox
    );

    return;
  }

  const heading =
    document.createElement("div");

  heading.innerHTML =
    "⚠️ <strong>Weather Alerts</strong>";

  heading.style.fontSize =
    "18px";

  heading.style.marginBottom =
    "4px";

  alertContainer.appendChild(
    heading
  );

  alerts.forEach((alert) => {
    const box =
      document.createElement("div");

    box.style.padding =
      "14px 16px";

    box.style.borderRadius =
      "14px";

    box.style.border =
      "1px solid rgba(255,255,255,0.12)";

    if (alert.type === "danger") {
      box.style.background =
        "rgba(255, 70, 70, 0.14)";
    } else if (
      alert.type === "warning"
    ) {
      box.style.background =
        "rgba(255, 180, 50, 0.14)";
    } else {
      box.style.background =
        "rgba(80, 160, 255, 0.14)";
    }

    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:5px;">
        ${alert.icon} ${escapeHTML(
          getAlertTitle(alert.title)
        )}
      </div>

      <div style="font-size:14px;line-height:1.5;">
        ${escapeHTML(
          getAlertMessage(alert)
        )}
      </div>
    `;

    alertContainer.appendChild(box);
  });
}

// ============================================================
// ALERT LANGUAGE HELPERS
// ============================================================

function getAlertTitle(title) {
  if (currentLanguage === "en") {
    return title;
  }

  if (currentLanguage === "hi") {
    const map = {
      "Thunderstorm Alert":
        "तूफान की चेतावनी",
      "Heavy Rain Alert":
        "भारी बारिश की चेतावनी",
      "Rain Advisory":
        "बारिश की सलाह",
      "Strong Wind Alert":
        "तेज़ हवा की चेतावनी",
      "Wind Advisory":
        "हवा की सलाह",
      "High UV Alert":
        "तेज़ UV की चेतावनी",
      "UV Advisory":
        "UV की सलाह",
      "Extreme Heat Alert":
        "अत्यधिक गर्मी की चेतावनी",
      "Heat Advisory":
        "गर्मी की सलाह",
      "Cold Weather Alert":
        "ठंडे मौसम की चेतावनी",
      "Snow Advisory":
        "बर्फबारी की सलाह"
    };

    return map[title] || title;
  }

  if (currentLanguage === "hinglish") {
    const map = {
      "Thunderstorm Alert":
        "Thunderstorm Alert",
      "Heavy Rain Alert":
        "Heavy Rain Alert",
      "Rain Advisory":
        "Rain Advisory",
      "Strong Wind Alert":
        "Tez Hawa Alert",
      "Wind Advisory":
        "Hawa Advisory",
      "High UV Alert":
        "High UV Alert",
      "UV Advisory":
        "UV Advisory",
      "Extreme Heat Alert":
        "Extreme Heat Alert",
      "Heat Advisory":
        "Heat Advisory",
      "Cold Weather Alert":
        "Thand ka Alert",
      "Snow Advisory":
        "Snow Advisory"
    };

    return map[title] || title;
  }

  if (currentLanguage === "te") {
    const map = {
      "Thunderstorm Alert":
        "ఉరుములతో కూడిన వర్షం హెచ్చరిక",
      "Heavy Rain Alert":
        "భారీ వర్షం హెచ్చరిక",
      "Rain Advisory":
        "వర్షం సూచన",
      "Strong Wind Alert":
        "బలమైన గాలి హెచ్చరిక",
      "Wind Advisory":
        "గాలి సూచన",
      "High UV Alert":
        "అధిక UV హెచ్చరిక",
      "UV Advisory":
        "UV సూచన",
      "Extreme Heat Alert":
        "తీవ్రమైన వేడి హెచ్చరిక",
      "Heat Advisory":
        "వేడి సూచన",
      "Cold Weather Alert":
        "చలి వాతావరణ హెచ్చరిక",
      "Snow Advisory":
        "మంచు సూచన"
    };

    return map[title] || title;
  }

  return title;
}

function getAlertMessage(alert) {
  if (currentLanguage === "hinglish") {
    return alert.message
      .replace(
        "Thunderstorm conditions are currently detected.",
        "Abhi thunderstorm conditions detect hui hain."
      )
      .replace(
        "Avoid unnecessary outdoor activities and stay in a safe place.",
        "Unnecessary outdoor activities avoid karo aur safe jagah par raho."
      )
      .replace(
        "There is a high chance of rain today",
        "Aaj baarish ka chance zyada hai"
      )
      .replace(
        "Carry rain protection and take care outdoors.",
        "Rain protection saath rakho aur bahar careful raho."
      )
      .replace(
        "There is a moderate chance of rain today",
        "Aaj baarish ka moderate chance hai"
      )
      .replace(
        "Keeping an umbrella handy may help.",
        "Chhata saath rakhna helpful rahega."
      )
      .replace(
        "Strong winds are currently around",
        "Abhi hawa ki speed around"
      )
      .replace(
        "Take extra care outdoors.",
        "Bahar extra careful raho."
      )
      .replace(
        "Winds are relatively strong at around",
        "Hawa relatively tez hai, around"
      )
      .replace(
        "The UV index is",
        "UV index"
      )
      .replace(
        "Limit prolonged exposure to direct sunlight and use sun protection outdoors.",
        "Direct sunlight mein zyada time na raho aur bahar sun protection use karo."
      )
      .replace(
        "Sun protection is recommended when outdoors for extended periods.",
        "Bahar zyada time rehna ho to sun protection use karna better rahega."
      )
      .replace(
        "The current temperature is",
        "Abhi temperature"
      )
      .replace(
        "Stay hydrated and avoid prolonged exposure to extreme heat.",
        "Hydrated raho aur zyada der extreme heat mein mat raho."
      )
      .replace(
        "Stay hydrated and take breaks from the heat.",
        "Hydrated raho aur heat mein breaks lete raho."
      )
      .replace(
        "Warm clothing is recommended.",
        "Garam clothes pehna better rahega."
      )
      .replace(
        "Snow conditions are currently detected.",
        "Abhi snow conditions detect hui hain."
      )
      .replace(
        "Take care while travelling and outdoors.",
        "Travel karte waqt aur bahar careful raho."
      );
  }

  if (currentLanguage === "hi") {
    return alert.message
      .replace(
        "Thunderstorm conditions are currently detected.",
        "अभी तूफान की स्थिति देखी गई है।"
      )
      .replace(
        "Avoid unnecessary outdoor activities and stay in a safe place.",
        "अनावश्यक बाहरी गतिविधियों से बचें और सुरक्षित स्थान पर रहें।"
      )
      .replace(
        "There is a high chance of rain today",
        "आज बारिश की संभावना अधिक है"
      )
      .replace(
        "Carry rain protection and take care outdoors.",
        "बारिश से बचाव का सामान रखें और बाहर सावधान रहें।"
      )
      .replace(
        "There is a moderate chance of rain today",
        "आज बारिश की मध्यम संभावना है"
      )
      .replace(
        "Keeping an umbrella handy may help.",
        "छाता साथ रखना उपयोगी होगा।"
      )
      .replace(
        "Strong winds are currently around",
        "अभी हवा की गति लगभग"
      )
      .replace(
        "Take extra care outdoors.",
        "बाहर अतिरिक्त सावधानी बरतें।"
      )
      .replace(
        "The UV index is",
        "UV इंडेक्स"
      )
      .replace(
        "The current temperature is",
        "वर्तमान तापमान"
      )
      .replace(
        "Warm clothing is recommended.",
        "गर्म कपड़े पहनने की सलाह दी जाती है।"
      );
  }

  if (currentLanguage === "te") {
    return alert.message
      .replace(
        "Thunderstorm conditions are currently detected.",
        "ప్రస్తుతం ఉరుములతో కూడిన వర్ష పరిస్థితులు గుర్తించబడ్డాయి."
      )
      .replace(
        "Avoid unnecessary outdoor activities and stay in a safe place.",
        "అవసరం లేని బహిరంగ కార్యకలాపాలను నివారించి సురక్షితమైన ప్రదేశంలో ఉండండి."
      )
      .replace(
        "There is a high chance of rain today",
        "ఈరోజు వర్షం పడే అవకాశం ఎక్కువగా ఉంది"
      )
      .replace(
        "Carry rain protection and take care outdoors.",
        "వర్షం నుండి రక్షణ కోసం అవసరమైన వస్తువులు తీసుకెళ్లండి."
      )
      .replace(
        "There is a moderate chance of rain today",
        "ఈరోజు వర్షం పడే అవకాశం ఉంది"
      )
      .replace(
        "The current temperature is",
        "ప్రస్తుత ఉష్ణోగ్రత"
      )
      .replace(
        "Warm clothing is recommended.",
        "వెచ్చని దుస్తులు ధరించడం మంచిది."
      );
  }

  return alert.message;
}

// ============================================================
// DISPLAY WEATHER
// ============================================================

function displayWeather(location, data) {
  currentLocation = location;
  currentWeather = data;

  const current = data.current;
  const daily = data.daily;

  const [description, icon] =
    weatherInfo(
      current.weather_code
    );

  cityName.textContent =
    location.name +
    (
      location.country_code
        ? `, ${location.country_code}`
        : ""
    );

  currentDate.textContent =
    formatDate(data.timezone);

  weatherIcon.textContent = icon;

  temperature.textContent =
    temperatureText(
      current.temperature_2m
    );

  condition.textContent =
    description;

  feelsLike.textContent =
    temperatureText(
      current.apparent_temperature
    );

  weatherDescription.textContent =
    `Current conditions are ${description.toLowerCase()}. ` +
    `The temperature is ${temperatureText(
      current.temperature_2m
    )} with ${current.relative_humidity_2m}% humidity.`;

  humidity.textContent =
    `${current.relative_humidity_2m}%`;

  wind.textContent =
    `${Math.round(
      current.wind_speed_10m
    )} km/h`;

  uv.textContent =
    current.uv_index !== undefined
      ? Math.round(current.uv_index)
      : "--";

  const todayIndex = 5;

  rainChance.textContent =
    daily.precipitation_probability_max?.[
      todayIndex
    ] !== undefined
      ? `${daily.precipitation_probability_max[
          todayIndex
        ]}%`
      : "--";

  sunrise.textContent =
    formatTime(
      daily.sunrise?.[todayIndex]
    );

  sunset.textContent =
    formatTime(
      daily.sunset?.[todayIndex]
    );

  daylight.textContent =
    formatDaylight(
      daily.daylight_duration?.[
        todayIndex
      ]
    );

  renderForecast(daily);

  // STEP 4 ALERTS
  displayWeatherAlerts(data);

  locationInput.value =
    location.name;
}

// ============================================================
// DAYLIGHT
// ============================================================

function formatDaylight(seconds) {
  if (!seconds) return "--";

  const totalMinutes =
    Math.round(seconds / 60);

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

// ============================================================
// FORECAST DISPLAY
// ============================================================

function renderForecast(daily) {
  forecastGrid.innerHTML = "";

  daily.time
    .slice(6, 11)
    .forEach((date, index) => {
      const realIndex = index + 6;

      const [description, icon] =
        weatherInfo(
          daily.weather_code[
            realIndex
          ]
        );

      const max =
        temperatureText(
          daily.temperature_2m_max[
            realIndex
          ]
        );

      const min =
        temperatureText(
          daily.temperature_2m_min[
            realIndex
          ]
        );

      const rain =
        daily
          .precipitation_probability_max?.[
          realIndex
        ];

      const card =
        document.createElement("div");

      card.className =
        "forecast-card";

      card.innerHTML = `
        <span>
          ${
            index === 0
              ? "Tomorrow"
              : formatDay(
                  date,
                  index + 1
                )
          }
        </span>

        <div class="forecast-icon">
          ${icon}
        </div>

        <strong>
          ${max} / ${min}
        </strong>

        <small>
          ${description}
        </small>

        <small>
          🌧️ ${rain ?? "--"}% rain
        </small>
      `;

      forecastGrid.appendChild(card);
    });
}

// ============================================================
// LOAD CITY
// ============================================================

async function loadCity(city) {
  if (!city || !city.trim()) {
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent =
    "Loading...";

  try {
    const location =
      await searchLocation(city);

    const weather =
      await getWeather(location);

    displayWeather(
      location,
      weather
    );

    currentHistory =
      buildHistory(weather);

    currentForecast =
      buildForecast(weather);

    addAIMessage(
      `Weather for ${location.name} is ready. 🌦️ Ask me a question or use the voice button.`
    );

    // Alert message
    const alerts =
      generateWeatherAlerts(weather);

    if (alerts.length) {
      addAIMessage(
        `⚠️ ${alerts.length} weather alert${
          alerts.length > 1 ? "s" : ""
        } detected for ${location.name}. Ask me "weather alerts" to see them.`
      );
    }

  } catch (error) {
    console.error(
      "Weather loading error:",
      error
    );

    addAIMessage(
      `Sorry, I couldn't load weather data for "${city}". Please try again.`
    );

  } finally {
    searchButton.disabled = false;
    searchButton.textContent =
      "Search";
  }
}

// ============================================================
// SEARCH EVENTS
// ============================================================

searchButton.addEventListener(
  "click",
  () => {
    loadCity(
      locationInput.value
    );
  }
);

locationInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      loadCity(
        locationInput.value
      );
    }
  }
);

// ============================================================
// QUICK CITIES
// ============================================================

document
  .querySelectorAll(
    ".quick-cities button"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        loadCity(
          button.dataset.city
        );
      }
    );
  });

// ============================================================
// CURRENT LOCATION
// ============================================================

locationButton.addEventListener(
  "click",
  () => {
    if (!navigator.geolocation) {
      addAIMessage(
        "Your browser doesn't support location access."
      );
      return;
    }

    locationButton.textContent =
      "⏳";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const location = {
            name: "My Location",
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            country_code: ""
          };

          const weather =
            await getWeather(
              location
            );

          displayWeather(
            location,
            weather
          );

          currentHistory =
            buildHistory(weather);

          currentForecast =
            buildForecast(weather);

          addAIMessage(
            "I've loaded the weather for your current location. 📍"
          );

          const alerts =
            generateWeatherAlerts(weather);

          if (alerts.length) {
            addAIMessage(
              `⚠️ ${alerts.length} weather alert${
                alerts.length > 1 ? "s" : ""
              } detected. Ask me "weather alerts" to see them.`
            );
          }

        } catch (error) {
          console.error(
            error
          );

          addAIMessage(
            "I couldn't load weather data for your current location."
          );

        } finally {
          locationButton.textContent =
            "📍";
        }
      },

      () => {
        locationButton.textContent =
          "📍";

        addAIMessage(
          "Location permission wasn't available. You can search for a city instead."
        );
      }
    );
  }
);

// ============================================================
// UNIT TOGGLE
// ============================================================

unitToggle.addEventListener(
  "click",
  () => {
    isFahrenheit =
      !isFahrenheit;

    unitToggle.textContent =
      isFahrenheit
        ? "°F"
        : "°C";

    if (
      currentWeather &&
      currentLocation
    ) {
      displayWeather(
        currentLocation,
        currentWeather
      );
    }
  }
);

// ============================================================
// THEME
// ============================================================

themeToggle.addEventListener(
  "click",
  () => {
    lightMode =
      !lightMode;

    if (lightMode) {
      document.documentElement.style.setProperty(
        "--bg",
        "#edf5ff"
      );

      document.documentElement.style.setProperty(
        "--bg2",
        "#dcecff"
      );

      document.documentElement.style.setProperty(
        "--text",
        "#10233d"
      );

      document.documentElement.style.setProperty(
        "--muted",
        "#52657c"
      );

      themeToggle.textContent =
        "🌙";

    } else {
      document.documentElement.style.setProperty(
        "--bg",
        "#07111f"
      );

      document.documentElement.style.setProperty(
        "--bg2",
        "#0d1b2f"
      );

      document.documentElement.style.setProperty(
        "--text",
        "#f4f8ff"
      );

      document.documentElement.style.setProperty(
        "--muted",
        "#9eb0c8"
      );

      themeToggle.textContent =
        "☀️";
    }
  }
);

// ============================================================
// CHAT MESSAGES
// ============================================================

function addUserMessage(message) {
  const div =
    document.createElement("div");

  div.className =
    "message";

  div.innerHTML = `
    <div class="message-avatar">
      👤
    </div>

    <div class="message-content">
      <p>
        ${escapeHTML(message)}
      </p>

      <span class="message-time">
        Just now
      </span>
    </div>
  `;

  chatMessages.appendChild(div);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;
}

function addAIMessage(message) {
  const div =
    document.createElement("div");

  div.className =
    "message ai-message";

  div.innerHTML = `
    <div class="message-avatar">
      🤖
    </div>

    <div class="message-content">
      <p>
        ${escapeHTML(message)}
      </p>

      <span class="message-time">
        Just now
      </span>
    </div>
  `;

  chatMessages.appendChild(div);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;
}

function escapeHTML(text) {
  const element =
    document.createElement("div");

  element.textContent =
    String(text);

  return element.innerHTML;
}

// ============================================================
// STEP 3 — LANGUAGE SYSTEM
// ============================================================

const languages = {
  en: {
    name: "English",
    speech: "en-IN"
  },

  hi: {
    name: "हिन्दी",
    speech: "hi-IN"
  },

  te: {
    name: "తెలుగు",
    speech: "te-IN"
  },

  hinglish: {
    name: "Hinglish",
    speech: "hi-IN"
  }
};

// ============================================================
// LANGUAGE SELECTOR
// ============================================================

function createLanguageSelector() {
  const navActions =
    document.querySelector(
      ".nav-actions"
    );

  if (!navActions) return;

  const wrapper =
    document.createElement("div");

  wrapper.style.display =
    "flex";

  wrapper.style.alignItems =
    "center";

  wrapper.style.gap =
    "6px";

  const select =
    document.createElement("select");

  select.id =
    "languageSelector";

  select.title =
    "Choose language";

  select.style.height =
    "40px";

  select.style.borderRadius =
    "12px";

  select.style.padding =
    "0 8px";

  select.style.background =
    "rgba(255,255,255,0.07)";

  select.style.color =
    "white";

  select.style.border =
    "1px solid rgba(255,255,255,0.09)";

  Object.keys(languages)
    .forEach((key) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = key;

      option.textContent =
        languages[key].name;

      option.style.color =
        "#111";

      select.appendChild(
        option
      );
    });

  select.value =
    currentLanguage;

  select.addEventListener(
    "change",
    () => {
      currentLanguage =
        select.value;

      // Refresh alerts in selected language
      if (
        currentWeather
      ) {
        displayWeatherAlerts(
          currentWeather
        );
      }

      if (
        currentLanguage === "hi"
      ) {
        addAIMessage(
          "भाषा हिन्दी में बदल दी गई है। 🇮🇳"
        );
      } else if (
        currentLanguage === "te"
      ) {
        addAIMessage(
          "భాష తెలుగుకు మార్చబడింది. 🇮🇳"
        );
      } else if (
        currentLanguage === "hinglish"
      ) {
        addAIMessage(
          "Language Hinglish mein change ho gayi hai. 🇮🇳"
        );
      } else {
        addAIMessage(
          "Language changed to English. 🇬🇧"
        );
      }
    }
  );

  wrapper.appendChild(select);

  navActions.insertBefore(
    wrapper,
    navActions.firstChild
  );
}

// ============================================================
// VOICE INPUT
// ============================================================

function setupVoiceRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return;
  }

  recognition =
    new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;

    if (voiceButton) {
      voiceButton.textContent =
        "🔴";

      voiceButton.title =
        "Listening...";
    }
  };

  recognition.onresult =
    (event) => {
      const transcript =
        event.results[0][0]
          .transcript;

      chatInput.value =
        transcript;

      sendChatMessage();
    };

  recognition.onerror =
    (event) => {
      console.error(
        "Voice recognition error:",
        event.error
      );

      addAIMessage(
        "I couldn't understand the voice input. Please try again."
      );
    };

  recognition.onend = () => {
    isListening = false;

    if (voiceButton) {
      voiceButton.textContent =
        "🎤";

      voiceButton.title =
        "Ask using voice";
    }
  };
}

// ============================================================
// CREATE VOICE BUTTON
// ============================================================

function createVoiceButton() {
  if (!chatInput) return;

  const chatInputContainer =
    chatInput.parentElement;

  if (!chatInputContainer) {
    return;
  }

  voiceButton =
    document.createElement("button");

  voiceButton.id =
    "voiceButton";

  voiceButton.type =
    "button";

  voiceButton.textContent =
    "🎤";

  voiceButton.title =
    "Ask using voice";

  voiceButton.style.width =
    "42px";

  voiceButton.style.height =
    "42px";

  voiceButton.style.borderRadius =
    "11px";

  voiceButton.style.color =
    "white";

  voiceButton.style.background =
    "rgba(255,255,255,0.08)";

  voiceButton.addEventListener(
    "click",
    () => {
      if (!recognition) {
        addAIMessage(
          "Voice input isn't supported by this browser. Try Chrome or Edge."
        );
        return;
      }

      if (isListening) {
        recognition.stop();
        return;
      }

      recognition.lang =
        languages[
          currentLanguage
        ].speech;

      recognition.start();
    }
  );

  chatInputContainer.insertBefore(
    voiceButton,
    sendButton
  );
}

// ============================================================
// VOICE OUTPUT
// ============================================================

function speakText(text) {
  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(
      text
    );

  speech.lang =
    languages[
      currentLanguage
    ].speech;

  speech.rate = 1;
  speech.pitch = 1;

  window.speechSynthesis.speak(
    speech
  );
}

// ============================================================
// SMART WEATHER AI
// ============================================================

async function answerWeatherQuestion(
  question
) {
  if (
    !currentWeather ||
    !currentLocation
  ) {
    return languageMessage(
      "Search for a city first so I can use its weather data. 🌦️"
    );
  }

  const current =
    currentWeather.current;

  const daily =
    currentWeather.daily;

  const location =
    currentLocation.name;

  const temp =
    current.temperature_2m;

  const feels =
    current.apparent_temperature;

  const condition =
    weatherInfo(
      current.weather_code
    )[0];

  const humidityValue =
    current.relative_humidity_2m;

  const windValue =
    Math.round(
      current.wind_speed_10m
    );

  const uvValue =
    Math.round(
      current.uv_index ?? 0
    );

  const todayIndex = 5;

  const rain =
    daily
      .precipitation_probability_max?.[
        todayIndex
      ] ?? 0;

  const q =
    question
      .toLowerCase()
      .trim();

  const unit =
    temperatureUnit();

  const unitName =
    unit.replace("°", "");

  // ----------------------------------------------------------
  // GREETING
  // ----------------------------------------------------------

  if (
    /^(hi|hello|hey|namaste|salam|assalamualaikum|hii|helo)\b/i.test(
      q
    )
  ) {
    return languageMessage(
      `Hello! 👋 I'm WeatherGPT for ${location}. Ask me about temperature, rain, humidity, wind, UV, sunrise, sunset, tomorrow, alerts, or the next 5 days.`
    );
  }

  // ----------------------------------------------------------
  // STEP 4 — WEATHER ALERTS
  // ----------------------------------------------------------

  if (
    q.includes("alert") ||
    q.includes("alerts") ||
    q.includes("warning") ||
    q.includes("warnings") ||
    q.includes("weather alert") ||
    q.includes("weather alerts") ||
    q.includes("koi alert") ||
    q.includes("alert hai") ||
    q.includes("alert h") ||
    q.includes("warning hai") ||
    q.includes("khatra") ||
    q.includes("savdhaan") ||
    q.includes("सावधान") ||
    q.includes("चेतावनी") ||
    q.includes("హెచ్చరిక")
  ) {
    const alerts =
      generateWeatherAlerts(
        currentWeather
      );

    if (!alerts.length) {
      return languageMessage(
        `There are currently no major weather alerts for ${location}. The weather conditions look relatively normal. ✅`
      );
    }

    const alertText =
      alerts
        .map(
          (alert) =>
            `• ${alert.title}: ${alert.message}`
        )
        .join("\n");

    return languageMessage(
      `Weather alerts for ${location}:\n\n${alertText}`
    );
  }

  // ----------------------------------------------------------
  // TEMPERATURE
  // ----------------------------------------------------------

  if (
    q.includes("temperature") ||
    q.includes("temp") ||
    q.includes("how hot") ||
    q.includes("how cold") ||
    q.includes("kitna garam") ||
    q.includes("kitni garmi") ||
    q.includes("kitna thanda") ||
    q.includes("taapman") ||
    q.includes("tapman") ||
    q.includes("garmi") ||
    q.includes("garmee") ||
    q.includes("गरमी") ||
    q.includes("तापमान") ||
    q.includes("వాతావరణం")
  ) {
    return languageMessage(
      `Currently in ${location}, it's ${temperatureText(
        temp
      )}${unitName} and it feels like ${temperatureText(
        feels
      )}${unitName}. 🌡️`
    );
  }

  // ----------------------------------------------------------
  // FEELS LIKE
  // ----------------------------------------------------------

  if (
    q.includes("feels like") ||
    q.includes("real feel") ||
    q.includes("aisa lag") ||
    q.includes("mehsoos")
  ) {
    return languageMessage(
      `It currently feels like ${temperatureText(
        feels
      )}${unitName} in ${location}.`
    );
  }

  // ----------------------------------------------------------
  // RAIN
  // ----------------------------------------------------------

  if (
    q.includes("rain") ||
    q.includes("baarish") ||
    q.includes("barish") ||
    q.includes("barsaat") ||
    q.includes("umbrella") ||
    q.includes("wet") ||
    q.includes("बारिश") ||
    q.includes("వర్షం")
  ) {
    let answer =
      `Today's rain probability in ${location} is ${rain}%. 🌧️`;

    if (Number(rain) >= 60) {
      answer +=
        " An umbrella would be a good idea.";
    } else if (Number(rain) >= 30) {
      answer +=
        " There is some chance of rain, so keeping an umbrella handy may help.";
    } else {
      answer +=
        " The chance of rain is relatively low.";
    }

    return languageMessage(
      answer
    );
  }

  // ----------------------------------------------------------
  // HUMIDITY
  // ----------------------------------------------------------

  if (
    q.includes("humidity") ||
    q.includes("humid") ||
    q.includes("nami") ||
    q.includes("nammi") ||
    q.includes("नमी") ||
    q.includes("తేమ")
  ) {
    return languageMessage(
      `Current humidity in ${location} is ${humidityValue}%. 💧`
    );
  }

  // ----------------------------------------------------------
  // WIND
  // ----------------------------------------------------------

  if (
    q.includes("wind") ||
    q.includes("windy") ||
    q.includes("hawa") ||
    q.includes("hava") ||
    q.includes("hawa kitni") ||
    q.includes("हवा") ||
    q.includes("గాలి")
  ) {
    return languageMessage(
      `Current wind speed in ${location} is ${windValue} km/h. 💨`
    );
  }

  // ----------------------------------------------------------
  // UV
  // ----------------------------------------------------------

  if (
    q.includes("uv") ||
    q.includes("sun protection") ||
    q.includes("sunscreen")
  ) {
    return languageMessage(
      `The current UV index in ${location} is ${uvValue}. ☀️ ${
        uvValue >= 6
          ? "Sun protection is recommended when outdoors."
          : "UV levels are currently not very high."
      }`
    );
  }

  // ----------------------------------------------------------
  // SUNRISE
  // ----------------------------------------------------------

  if (
    q.includes("sunrise") ||
    q.includes("suraj kab niklega") ||
    q.includes("suraj nikal") ||
    q.includes("suryoday") ||
    q.includes("सूर्योदय") ||
    q.includes("సూర్యోదయం")
  ) {
    return languageMessage(
      `Sunrise in ${location} is at ${formatTime(
        daily.sunrise?.[
          todayIndex
        ]
      )}. 🌅`
    );
  }

  // ----------------------------------------------------------
  // SUNSET
  // ----------------------------------------------------------

  if (
    q.includes("sunset") ||
    q.includes("suraj kab doobega") ||
    q.includes("suraj dub") ||
    q.includes("suryast") ||
    q.includes("सूर्यास्त") ||
    q.includes("సూర్యాస్తమయం")
  ) {
    return languageMessage(
      `Sunset in ${location} is at ${formatTime(
        daily.sunset?.[
          todayIndex
        ]
      )}. 🌇`
    );
  }

  // ----------------------------------------------------------
  // TOMORROW
  // ----------------------------------------------------------

  if (
    q.includes("tomorrow") ||
    q.includes("next day") ||
    q.includes("kal") ||
    q.includes("kal ka mausam") ||
    q.includes("kal weather") ||
    q.includes("कल") ||
    q.includes("రేపు")
  ) {
    const tomorrow =
      currentForecast[0];

    if (tomorrow) {
      return languageMessage(
        `Tomorrow in ${location}: ${tomorrow.condition}, high ${temperatureText(
          tomorrow.max
        )}${unitName}, low ${temperatureText(
          tomorrow.min
        )}${unitName}, and ${tomorrow.rain}% rain chance. 🌦️`
      );
    }
  }

  // ----------------------------------------------------------
  // NEXT 5 DAYS
  // ----------------------------------------------------------

  if (
    q.includes("next 5") ||
    q.includes("next five") ||
    q.includes("next five days") ||
    q.includes("5 day forecast") ||
    q.includes("five day forecast") ||
    q.includes("upcoming") ||
    q.includes("coming days") ||
    q.includes("forecast") ||
    q.includes("agale 5") ||
    q.includes("agle 5") ||
    q.includes("agle paanch") ||
    q.includes("aane wale din") ||
    q.includes("अगले 5") ||
    q.includes("अगले पांच")
  ) {
    if (currentForecast.length) {
      const lines =
        currentForecast.map(
          (day) =>
            `${day.label}: ${day.condition}, high ${temperatureText(
              day.max
            )}${unitName}, low ${temperatureText(
              day.min
            )}${unitName}, rain ${day.rain}%`
        );

      return languageMessage(
        `Here is the next 5-day forecast for ${location}:\n\n${lines.join(
          "\n"
        )}`
      );
    }
  }

  // ----------------------------------------------------------
  // PREVIOUS 5 DAYS
  // ----------------------------------------------------------

  if (
    q.includes("previous 5") ||
    q.includes("previous five") ||
    q.includes("past 5") ||
    q.includes("past five") ||
    q.includes("last 5 days") ||
    q.includes("last five days") ||
    q.includes("weather history") ||
    q.includes("historical weather") ||
    q.includes("previous days") ||
    q.includes("pichle 5") ||
    q.includes("pichhle 5") ||
    q.includes("pichle paanch") ||
    q.includes("pichhle paanch") ||
    q.includes("purane din")
  ) {
    if (currentHistory.length) {
      const lines =
        currentHistory.map(
          (day) =>
            `${day.label}: ${day.condition}, high ${temperatureText(
              day.max
            )}${unitName}, low ${temperatureText(
              day.min
            )}${unitName}, precipitation ${day.rain} mm`
        );

      return languageMessage(
        `Here is the previous 5-day weather history for ${location}:\n\n${lines.join(
          "\n"
        )}`
      );
    }
  }

  // ----------------------------------------------------------
  // YESTERDAY
  // ----------------------------------------------------------

  if (
    q.includes("yesterday") ||
    q.includes("previous day") ||
    q.includes("kal ka mausam") ||
    q.includes("kal ka weather") ||
    q.includes("कल का मौसम")
  ) {
    const yesterday =
      currentHistory[
        currentHistory.length - 1
      ];

    if (yesterday) {
      return languageMessage(
        `Yesterday in ${location}: ${yesterday.condition}, high ${temperatureText(
          yesterday.max
        )}${unitName}, low ${temperatureText(
          yesterday.min
        )}${unitName}, with ${yesterday.rain} mm precipitation.`
      );
    }
  }

  // ----------------------------------------------------------
  // TODAY
  // ----------------------------------------------------------

  if (
    q.includes("today") ||
    q.includes("current weather") ||
    q.includes("weather now") ||
    q.includes("aaj") ||
    q.includes("aaj ka mausam") ||
    q.includes("aaj weather") ||
    q.includes("आज") ||
    q.includes("ఈరోజు")
  ) {
    return languageMessage(
      `Today's weather in ${location}: ${condition}, ${temperatureText(
        temp
      )}${unitName}, feels like ${temperatureText(
        feels
      )}${unitName}, ${rain}% rain chance, ${humidityValue}% humidity, and ${windValue} km/h wind. 🌦️`
    );
  }

  // ----------------------------------------------------------
  // HOTTEST
  // ----------------------------------------------------------

  if (
    q.includes("hottest") ||
    q.includes("hottest day") ||
    q.includes("sabse garam") ||
    q.includes("sabse garmi")
  ) {
    const allDays = [
      ...currentHistory,
      {
        label: "Today",
        max: temp,
        min: temp
      },
      ...currentForecast
    ].filter(
      (day) =>
        Number.isFinite(
          Number(day.max)
        )
    );

    if (allDays.length) {
      const hottest =
        allDays.reduce(
          (a, b) =>
            Number(b.max) >
            Number(a.max)
              ? b
              : a
        );

      return languageMessage(
        `The hottest day in the available data is ${hottest.label}, with a high of ${temperatureText(
          hottest.max
        )}${unitName}. 🔥`
      );
    }
  }

  // ----------------------------------------------------------
  // COLDEST
  // ----------------------------------------------------------

  if (
    q.includes("coldest") ||
    q.includes("coldest day") ||
    q.includes("sabse thanda") ||
    q.includes("sabse thand")
  ) {
    const allDays = [
      ...currentHistory,
      {
        label: "Today",
        max: temp,
        min: temp
      },
      ...currentForecast
    ].filter(
      (day) =>
        Number.isFinite(
          Number(day.min)
        )
    );

    if (allDays.length) {
      const coldest =
        allDays.reduce(
          (a, b) =>
            Number(b.min) <
            Number(a.min)
              ? b
              : a
        );

      return languageMessage(
        `The coldest day in the available data is ${coldest.label}, with a low of ${temperatureText(
          coldest.min
        )}${unitName}. ❄️`
      );
    }
  }

  // ----------------------------------------------------------
  // CLOTHING
  // ----------------------------------------------------------

  if (
    q.includes("wear") ||
    q.includes("clothes") ||
    q.includes("clothing") ||
    q.includes("dress") ||
    q.includes("kya pehnu") ||
    q.includes("kya pehne") ||
    q.includes("kapde") ||
    q.includes("kapda")
  ) {
    let advice;

    if (Number(temp) >= 32) {
      advice =
        "Light, breathable clothing would be more comfortable.";
    } else if (Number(temp) >= 24) {
      advice =
        "Light and comfortable clothing should work well.";
    } else if (Number(temp) >= 16) {
      advice =
        "A light jacket or extra layer may be useful.";
    } else {
      advice =
        "Warmer clothing and extra layers would be useful.";
    }

    return languageMessage(
      `${advice} Current temperature is ${temperatureText(
        temp
      )}${unitName}. 👕`
    );
  }

  // ----------------------------------------------------------
  // OUTDOOR
  // ----------------------------------------------------------

  if (
    q.includes("outdoor") ||
    q.includes("go outside") ||
    q.includes("outside activity") ||
    q.includes("walk") ||
    q.includes("exercise") ||
    q.includes("bahar") ||
    q.includes("bahar ja") ||
    q.includes("bahar jana") ||
    q.includes("walk kar")
  ) {
    if (Number(rain) >= 60) {
      return languageMessage(
        `Outdoor activities may be difficult today because the rain probability is ${rain}%. 🌧️`
      );
    }

    if (Number(uvValue) >= 6) {
      return languageMessage(
        `Outdoor activities are possible, but the UV index is ${uvValue}, so sun protection is recommended. ☀️`
      );
    }

    return languageMessage(
      `Conditions look reasonably suitable for outdoor activities today: ${condition}, ${temperatureText(
        temp
      )}${unitName}, and ${rain}% rain chance. 👍`
    );
  }

  // ----------------------------------------------------------
  // WEATHER ADVISORY
  // ----------------------------------------------------------

  if (
    q.includes("advice") ||
    q.includes("advisory") ||
    q.includes("safe") ||
    q.includes("salah") ||
    q.includes("mashwara") ||
    q.includes("kya safe hai")
  ) {
    let advice =
      `Weather advisory for ${location}: `;

    if (Number(rain) >= 70) {
      advice +=
        "High chance of rain. Carry rain protection and be cautious outdoors. 🌧️";
    } else if (Number(uvValue) >= 8) {
      advice +=
        "UV levels are very high. Limit prolonged exposure to direct sunlight. ☀️";
    } else if (Number(windValue) >= 40) {
      advice +=
        "Strong winds are present. Take care during outdoor activities. 💨";
    } else {
      advice +=
        "No major weather concern detected from the available conditions. 👍";
    }

    return languageMessage(
      advice
    );
  }

  // ----------------------------------------------------------
  // DEFAULT
  // ----------------------------------------------------------

  return languageMessage(
    `I can help with the weather in ${location}. Try asking about temperature, rain, humidity, wind, UV, sunrise, sunset, tomorrow, weather alerts, the next 5 days, clothing, outdoor activities, or weather advice. 🌦️`
  );
}

// ============================================================
// MULTILINGUAL RESPONSE SUPPORT
// ============================================================

function languageMessage(
  englishText
) {
  if (currentLanguage === "en") {
    return englishText;
  }

  if (currentLanguage === "hi") {
    return translateToHindi(
      englishText
    );
  }

  if (currentLanguage === "te") {
    return translateToTelugu(
      englishText
    );
  }

  if (currentLanguage === "hinglish") {
    return translateToHinglish(
      englishText
    );
  }

  return englishText;
}

// ============================================================
// HINDI TRANSLATION
// ============================================================

function translateToHindi(text) {
  return text
    .replace(
      "Currently in",
      "अभी"
    )
    .replace(
      "Today's weather in",
      "आज का मौसम"
    )
    .replace(
      "Today's rain probability in",
      "आज"
    )
    .replace(
      "Current humidity in",
      "वर्तमान नमी"
    )
    .replace(
      "Current wind speed in",
      "वर्तमान हवा की गति"
    )
    .replace(
      "Sunrise in",
      "सूर्योदय"
    )
    .replace(
      "Sunset in",
      "सूर्यास्त"
    )
    .replace(
      "Tomorrow in",
      "कल"
    )
    .replace(
      "Yesterday in",
      "कल"
    )
    .replace(
      "The hottest day",
      "सबसे गर्म दिन"
    )
    .replace(
      "The coldest day",
      "सबसे ठंडा दिन"
    )
    .replace(
      "Light, breathable clothing would be more comfortable.",
      "हल्के और आरामदायक कपड़े पहनना बेहतर रहेगा।"
    )
    .replace(
      "Light and comfortable clothing should work well.",
      "हल्के और आरामदायक कपड़े अच्छे रहेंगे।"
    )
    .replace(
      "A light jacket or extra layer may be useful.",
      "हल्की जैकेट या अतिरिक्त परत उपयोगी हो सकती है।"
    )
    .replace(
      "Warmer clothing and extra layers would be useful.",
      "गर्म कपड़े और अतिरिक्त परतें उपयोगी रहेंगी।"
    )
    .replace(
      "An umbrella would be a good idea.",
      "छाता साथ रखना अच्छा रहेगा।"
    )
    .replace(
      "There is some chance of rain, so keeping an umbrella handy may help.",
      "बारिश की कुछ संभावना है, इसलिए छाता साथ रखना उपयोगी होगा।"
    )
    .replace(
      "The chance of rain is relatively low.",
      "बारिश की संभावना कम है।"
    )
    .replace(
      "There are currently no major weather alerts for",
      "अभी कोई बड़ी मौसम चेतावनी नहीं है"
    )
    .replace(
      "Weather alerts for",
      "मौसम की चेतावनियाँ"
    )
    .replace(
      "No major weather alerts detected.",
      "कोई बड़ी मौसम चेतावनी नहीं मिली।"
    );
}

// ============================================================
// TELUGU TRANSLATION
// ============================================================

function translateToTelugu(text) {
  return text
    .replace(
      "Currently in",
      "ప్రస్తుతం"
    )
    .replace(
      "Today's weather in",
      "ఈరోజు వాతావరణం"
    )
    .replace(
      "Tomorrow in",
      "రేపు"
    )
    .replace(
      "Yesterday in",
      "నిన్న"
    )
    .replace(
      "Sunrise in",
      "సూర్యోదయం"
    )
    .replace(
      "Sunset in",
      "సూర్యాస్తమయం"
    )
    .replace(
      "Current humidity in",
      "ప్రస్తుత తేమ"
    )
    .replace(
      "Current wind speed in",
      "ప్రస్తుత గాలి వేగం"
    )
    .replace(
      "Light and comfortable clothing should work well.",
      "తేలికైన మరియు సౌకర్యవంతమైన దుస్తులు మంచివి."
    )
    .replace(
      "There are currently no major weather alerts for",
      "ప్రస్తుతం పెద్ద వాతావరణ హెచ్చరికలు లేవు"
    )
    .replace(
      "Weather alerts for",
      "వాతావరణ హెచ్చరికలు"
    );
}

// ============================================================
// HINGLISH TRANSLATION
// Roman Hindi + English
// ============================================================

function translateToHinglish(text) {
  return text
    .replace(
      "Hello!",
      "Hello!"
    )
    .replace(
      "I'm WeatherGPT for",
      "main WeatherGPT hoon aur"
    )
    .replace(
      "Ask me about temperature, rain, humidity, wind, UV, sunrise, sunset, tomorrow, or the next 5 days.",
      "aap mujhse temperature, baarish, humidity, hawa, UV, sunrise, sunset, kal ya agle 5 din ke weather ke baare mein pooch sakte ho."
    )
    .replace(
      "Currently in",
      "Abhi"
    )
    .replace(
      "it's",
      "temperature"
    )
    .replace(
      "and it feels like",
      "aur feel ho raha hai"
    )
    .replace(
      "Today's rain probability in",
      "Aaj"
    )
    .replace(
      "Current humidity in",
      "Abhi humidity"
    )
    .replace(
      "Current wind speed in",
      "Abhi hawa ki speed"
    )
    .replace(
      "Sunrise in",
      "Sunrise"
    )
    .replace(
      "Sunset in",
      "Sunset"
    )
    .replace(
      "Tomorrow in",
      "Kal"
    )
    .replace(
      "Yesterday in",
      "Kal"
    )
    .replace(
      "Today's weather in",
      "Aaj ka weather"
    )
    .replace(
      "The hottest day in the available data is",
      "Available data mein sabse garam din"
    )
    .replace(
      "The coldest day in the available data is",
      "Available data mein sabse thanda din"
    )
    .replace(
      "high",
      "maximum"
    )
    .replace(
      "low",
      "minimum"
    )
    .replace(
      "rain chance",
      "baarish ka chance"
    )
    .replace(
      "with",
      "aur"
    )
    .replace(
      "precipitation",
      "baarish"
    )
    .replace(
      "Current conditions are",
      "Abhi weather condition"
    )
    .replace(
      "The temperature is",
      "temperature"
    )
    .replace(
      "humidity",
      "humidity"
    )
    .replace(
      "An umbrella would be a good idea.",
      "Chhata saath rakhna achha rahega."
    )
    .replace(
      "There is some chance of rain, so keeping an umbrella handy may help.",
      "Baarish ki thodi possibility hai, isliye chhata saath rakhna better rahega."
    )
    .replace(
      "The chance of rain is relatively low.",
      "Baarish ka chance kaafi kam hai."
    )
    .replace(
      "The current UV index in",
      "Abhi UV index"
    )
    .replace(
      "Sun protection is recommended when outdoors.",
      "Bahar jaate waqt sun protection use karna better rahega."
    )
    .replace(
      "UV levels are currently not very high.",
      "Abhi UV level zyada nahi hai."
    )
    .replace(
      "It currently feels like",
      "Abhi feel"
    )
    .replace(
      "Outdoor activities may be difficult today because the rain probability is",
      "Aaj outdoor activities mushkil ho sakti hain kyunki baarish ka chance"
    )
    .replace(
      "Outdoor activities are possible, but the UV index is",
      "Outdoor activities kar sakte ho, lekin UV index"
    )
    .replace(
      "so sun protection is recommended.",
      "isliye sun protection use karna better rahega."
    )
    .replace(
      "Conditions look reasonably suitable for outdoor activities today:",
      "Aaj outdoor activities ke liye weather theek lag raha hai:"
    )
    .replace(
      "Light, breathable clothing would be more comfortable.",
      "Halki aur breathable clothes pehna zyada comfortable rahega."
    )
    .replace(
      "Light and comfortable clothing should work well.",
      "Halki aur comfortable clothes achhe rahenge."
    )
    .replace(
      "A light jacket or extra layer may be useful.",
      "Halki jacket ya extra layer useful ho sakti hai."
    )
    .replace(
      "Warmer clothing and extra layers would be useful.",
      "Garam clothes aur extra layers useful rahenge."
    )
    .replace(
      "Weather advisory for",
      "Weather advisory"
    )
    .replace(
      "High chance of rain.",
      "Baarish ka chance zyada hai."
    )
    .replace(
      "Carry rain protection and be cautious outdoors.",
      "Rain protection saath rakho aur bahar careful raho."
    )
    .replace(
      "Strong winds are present.",
      "Hawa tez chal rahi hai."
    )
    .replace(
      "Take care during outdoor activities.",
      "Outdoor activities ke waqt careful raho."
    )
    .replace(
      "No major weather concern detected from the available conditions.",
      "Available weather conditions ke hisaab se koi major concern nahi hai."
    )
    .replace(
      "Here is the next 5-day forecast for",
      "Yeh raha"
    )
    .replace(
      "Here is the previous 5-day weather history for",
      "Yeh raha pichle 5 din ka weather history"
    )
    .replace(
      "I can help with the weather in",
      "Main"
    )
    .replace(
      "temperature, rain, humidity, wind, UV, sunrise, sunset, tomorrow, the next 5 days, clothing, outdoor activities, or weather advice.",
      "temperature, baarish, humidity, hawa, UV, sunrise, sunset, kal, agle 5 din, kapde, outdoor activities ya weather advice ke baare mein pooch sakte ho."
    )
    .replace(
      "There are currently no major weather alerts for",
      "Abhi"
    )
    .replace(
      "Weather alerts for",
      "Weather alerts"
    )
    .replace(
      "There are currently no major weather alerts",
      "Abhi koi major weather alert nahi hai"
    );
}

// ============================================================
// SEND CHAT MESSAGE
// ============================================================

async function sendChatMessage() {
  const message =
    chatInput.value.trim();

  if (!message) return;

  addUserMessage(message);

  chatInput.value = "";

  const thinkingMessage =
    document.createElement("div");

  thinkingMessage.className =
    "message ai-message";

  thinkingMessage.innerHTML = `
    <div class="message-avatar">
      🤖
    </div>

    <div class="message-content">
      <p>
        Thinking... 🌦️
      </p>
    </div>
  `;

  chatMessages.appendChild(
    thinkingMessage
  );

  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  try {
    const answer =
      await answerWeatherQuestion(
        message
      );

    const paragraph =
      thinkingMessage.querySelector(
        "p"
      );

    if (paragraph) {
      paragraph.textContent =
        answer;
    }

    // Voice output
    speakText(answer);

  } catch (error) {
    console.error(
      "WeatherGPT error:",
      error
    );

    const paragraph =
      thinkingMessage.querySelector(
        "p"
      );

    if (paragraph) {
      paragraph.textContent =
        "Sorry, I couldn't process that weather question.";
    }
  }

  chatMessages.scrollTop =
    chatMessages.scrollHeight;
}

// ============================================================
// CHAT EVENTS
// ============================================================

sendButton.addEventListener(
  "click",
  sendChatMessage
);

chatInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChatMessage();
    }
  }
);

// ============================================================
// SUGGESTIONS
// ============================================================

document
  .querySelectorAll(
    ".suggestions button"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const question =
          button.dataset.question;

        chatInput.value =
          question;

        sendChatMessage();
      }
    );
  });

// ============================================================
// START STEP 3 + STEP 4 FEATURES
// ============================================================

createLanguageSelector();

setupVoiceRecognition();

createVoiceButton();

// ============================================================
// STARTUP
// ============================================================

loadCity("Hyderabad");