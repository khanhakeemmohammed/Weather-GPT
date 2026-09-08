import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "WeatherGPT backend is running"
  });
});

app.post("/api/chat", (req, res) => {
  try {
    const { message, weather } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please provide a message."
      });
    }

    if (!weather) {
      return res.json({
        reply:
          "Please search for a city first so I can answer using its weather data. 🌦️"
      });
    }

    const q = message.toLowerCase().trim();

    const current = weather.current || {};
    const forecast = weather.forecast || [];
    const history = weather.history || [];

    const location = weather.location || "this location";

    const temp = current.temperature;
    const feelsLike = current.feelsLike;
    const condition = current.condition || "Unknown";
    const humidity = current.humidity;
    const wind = current.wind;
    const rainChance = current.rainChance;
    const uv = current.uv;
    const sunrise = current.sunrise;
    const sunset = current.sunset;

    const tempUnit = weather.unit === "F" ? "°F" : "°C";

    // ---------- HELPERS ----------

    const formatDayName = (date) => {
      if (!date) return "Unknown day";

      const d = new Date(`${date}T12:00:00`);

      return d.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short"
      });
    };

    const findDay = (days, keywords) => {
      return days.find((day) =>
        keywords.some((word) =>
          String(day.label || "").toLowerCase().includes(word)
        )
      );
    };

    // ---------- GREETING ----------

    if (
      /^(hi|hello|hey|hola|namaste|assalamualaikum|salam)\b/i.test(q)
    ) {
      return res.json({
        reply:
          `Hello! 👋 I'm WeatherGPT for ${location}. ` +
          `Ask me about temperature, rain, wind, UV, sunrise, sunset, ` +
          `the next 5 days, or the previous 5 days. 🌦️`
      });
    }

    // ---------- CURRENT TEMPERATURE ----------

    if (
      q.includes("temperature") ||
      q.includes("temp") ||
      q.includes("how hot") ||
      q.includes("how cold")
    ) {
      return res.json({
        reply:
          `Currently in ${location}, it's ${temp}${tempUnit} ` +
          `and feels like ${feelsLike}${tempUnit}. 🌡️`
      });
    }

    // ---------- FEELS LIKE ----------

    if (
      q.includes("feels like") ||
      q.includes("real feel") ||
      q.includes("apparent temperature")
    ) {
      return res.json({
        reply:
          `It currently feels like ${feelsLike}${tempUnit} in ${location}.`
      });
    }

    // ---------- CONDITION ----------

    if (
      q.includes("weather") ||
      q.includes("condition") ||
      q.includes("outside")
    ) {
      return res.json({
        reply:
          `Currently in ${location}: ${condition}, ${temp}${tempUnit}, ` +
          `humidity ${humidity}%, wind ${wind} km/h. 🌦️`
      });
    }

    // ---------- RAIN ----------

    if (
      q.includes("rain") ||
      q.includes("umbrella") ||
      q.includes("wet")
    ) {
      if (rainChance !== undefined && rainChance !== null) {
        let answer =
          `Today's rain probability in ${location} is ${rainChance}%. 🌧️`;

        if (Number(rainChance) >= 60) {
          answer += " Carrying an umbrella would be a good idea.";
        } else if (Number(rainChance) >= 30) {
          answer += " There is some chance of rain, so keep an umbrella handy.";
        } else {
          answer += " The chance of rain is relatively low.";
        }

        return res.json({ reply: answer });
      }
    }

    // ---------- HUMIDITY ----------

    if (
      q.includes("humidity") ||
      q.includes("humid")
    ) {
      return res.json({
        reply:
          `The current humidity in ${location} is ${humidity}%. 💧`
      });
    }

    // ---------- WIND ----------

    if (
      q.includes("wind") ||
      q.includes("windy")
    ) {
      return res.json({
        reply:
          `The current wind speed in ${location} is ${wind} km/h. 💨`
      });
    }

    // ---------- UV ----------

    if (
      q.includes("uv") ||
      q.includes("sun protection") ||
      q.includes("sunscreen")
    ) {
      return res.json({
        reply:
          `The current UV index in ${location} is ${uv}. ☀️ ` +
          `If the UV level is high, protect your skin and eyes when outdoors.`
      });
    }

    // ---------- SUNRISE ----------

    if (q.includes("sunrise")) {
      return res.json({
        reply:
          `Sunrise in ${location} is at ${sunrise}. 🌅`
      });
    }

    // ---------- SUNSET ----------

    if (q.includes("sunset")) {
      return res.json({
        reply:
          `Sunset in ${location} is at ${sunset}. 🌇`
      });
    }

    // ---------- TODAY ----------

    if (
      q.includes("today") &&
      !q.includes("rain") &&
      !q.includes("sunrise") &&
      !q.includes("sunset")
    ) {
      return res.json({
        reply:
          `Today's weather in ${location}: ${condition}, ` +
          `${temp}${tempUnit}, feels like ${feelsLike}${tempUnit}, ` +
          `${rainChance}% rain chance, humidity ${humidity}%, ` +
          `and wind ${wind} km/h. 🌦️`
      });
    }

    // ---------- TOMORROW ----------

    if (
      q.includes("tomorrow") ||
      q.includes("next day")
    ) {
      const tomorrow = forecast[1] || forecast[0];

      if (tomorrow) {
        return res.json({
          reply:
            `Tomorrow (${formatDayName(tomorrow.date)}) in ${location}: ` +
            `${tomorrow.condition}, high ${tomorrow.max}${tempUnit}, ` +
            `low ${tomorrow.min}${tempUnit}, ` +
            `${tomorrow.rain}% rain chance. 🌦️`
        });
      }
    }

    // ---------- NEXT 5 DAYS ----------

    if (
      q.includes("next 5") ||
      q.includes("5 day forecast") ||
      q.includes("five day") ||
      q.includes("upcoming days") ||
      q.includes("coming days") ||
      q.includes("forecast")
    ) {
      if (forecast.length > 0) {
        const lines = forecast
          .slice(0, 5)
          .map(
            (day) =>
              `${formatDayName(day.date)}: ${day.condition}, ` +
              `${day.max}${tempUnit}/${day.min}${tempUnit}, ` +
              `${day.rain}% rain`
          );

        return res.json({
          reply:
            `Here is the 5-day forecast for ${location}:\n\n` +
            lines.join("\n")
        });
      }
    }

    // ---------- PREVIOUS 5 DAYS ----------

    if (
      q.includes("previous 5") ||
      q.includes("past 5") ||
      q.includes("last 5") ||
      q.includes("history") ||
      q.includes("historical")
    ) {
      if (history.length > 0) {
        const lines = history
          .slice(-5)
          .map(
            (day) =>
              `${formatDayName(day.date)}: ${day.condition}, ` +
              `${day.max}${tempUnit}/${day.min}${tempUnit}`
          );

        return res.json({
          reply:
            `Here is the previous 5-day weather history for ${location}:\n\n` +
            lines.join("\n")
        });
      }
    }

    // ---------- YESTERDAY ----------

    if (
      q.includes("yesterday") ||
      q.includes("previous day")
    ) {
      const yesterday = history[history.length - 1];

      if (yesterday) {
        return res.json({
          reply:
            `Yesterday (${formatDayName(yesterday.date)}) in ${location}: ` +
            `${yesterday.condition}, high ${yesterday.max}${tempUnit}, ` +
            `low ${yesterday.min}${tempUnit}.`
        });
      }
    }

    // ---------- HOTTEST DAY ----------

    if (
      q.includes("hottest") ||
      q.includes("hottest day")
    ) {
      const allDays = [...history, ...forecast]
        .filter((d) => Number.isFinite(Number(d.max)));

      if (allDays.length > 0) {
        const hottest = allDays.reduce((a, b) =>
          Number(b.max) > Number(a.max) ? b : a
        );

        return res.json({
          reply:
            `The hottest day in the available data is ` +
            `${formatDayName(hottest.date)}, with a high of ` +
            `${hottest.max}${tempUnit}. 🔥`
        });
      }
    }

    // ---------- COLDEST DAY ----------

    if (
      q.includes("coldest") ||
      q.includes("coldest day")
    ) {
      const allDays = [...history, ...forecast]
        .filter((d) => Number.isFinite(Number(d.min)));

      if (allDays.length > 0) {
        const coldest = allDays.reduce((a, b) =>
          Number(b.min) < Number(a.min) ? b : a
        );

        return res.json({
          reply:
            `The coldest day in the available data is ` +
            `${formatDayName(coldest.date)}, with a low of ` +
            `${coldest.min}${tempUnit}. ❄️`
        });
      }
    }

    // ---------- OUTDOOR ACTIVITIES ----------

    if (
      q.includes("outdoor") ||
      q.includes("outside activity") ||
      q.includes("go outside") ||
      q.includes("walk") ||
      q.includes("exercise")
    ) {
      let advice =
        `For outdoor activities in ${location}, it's currently ` +
        `${condition} with ${temp}${tempUnit} and ${rainChance}% rain chance. `;

      if (Number(rainChance) >= 60) {
        advice += "Rain may make outdoor activities difficult. 🌧️";
      } else if (Number(uv) >= 6) {
        advice += "Outdoor activity is possible, but UV protection is recommended. ☀️";
      } else {
        advice += "Conditions look reasonably suitable for outdoor activities. 👍";
      }

      return res.json({
        reply: advice
      });
    }

    // ---------- CLOTHING ----------

    if (
      q.includes("wear") ||
      q.includes("clothes") ||
      q.includes("clothing")
    ) {
      let advice = "";

      if (Number(temp) >= 32) {
        advice =
          "Light, breathable clothing would be more comfortable in this heat.";
      } else if (Number(temp) >= 24) {
        advice =
          "Light and comfortable clothing should work well.";
      } else if (Number(temp) >= 16) {
        advice =
          "A light jacket or an extra layer may be useful.";
      } else {
        advice =
          "Warmer clothing and extra layers would be useful.";
      }

      return res.json({
        reply: `${advice} Current temperature: ${temp}${tempUnit}. 👕`
      });
    }

    // ---------- DEFAULT ----------

    return res.json({
      reply:
    `I can help with the weather in ${location}. ` +
    `Try asking about temperature, rain, humidity, wind, UV, ` +
    `sunrise, sunset, tomorrow, the next 5 days, or the previous 5 days. 🌦️`
});

  } catch (error) {
    console.error("WeatherGPT ERROR:", error);

    res.status(500).json({
      error: "WeatherGPT could not process the question."
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `WeatherGPT backend running at http://localhost:${PORT}`
  );
});