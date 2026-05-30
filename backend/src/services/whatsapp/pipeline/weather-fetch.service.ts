/** Shared Open-Meteo forecast for farmer location (pincode or district fallback). */

export type WeatherForecast = {
  lat: number;
  lon: number;
  locationLabel: string;
  rainMmToday: number;
  rainMmTomorrow: number;
  maxTempCToday: number;
  avgHumidityPct: number;
  heavyRainLikely: boolean;
  highHeatLikely: boolean;
  highHumidityLikely: boolean;
  weatherRiskScore: number;
};

const DISTRICT_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  wayanad: { lat: 11.6854, lon: 76.132, label: 'Wayanad' },
  idukki: { lat: 9.9185, lon: 76.9438, label: 'Idukki' },
  ernakulam: { lat: 9.9312, lon: 76.2673, label: 'Ernakulam' },
  kochi: { lat: 9.9312, lon: 76.2673, label: 'Kochi' },
  thrissur: { lat: 10.5276, lon: 76.2144, label: 'Thrissur' },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru' },
  bangalore: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru' },
};

const DEFAULT = DISTRICT_COORDS.wayanad;

export function resolveCoords(params: {
  district?: string | null;
  pincodeLat?: number | null;
  pincodeLon?: number | null;
  pincodeLabel?: string | null;
}): { lat: number; lon: number; label: string } {
  if (params.pincodeLat != null && params.pincodeLon != null) {
    return {
      lat: params.pincodeLat,
      lon: params.pincodeLon,
      label: params.pincodeLabel ?? params.district ?? 'Field location',
    };
  }
  const key = String(params.district ?? 'wayanad')
    .toLowerCase()
    .replace(/\s+/g, '');
  const hit = DISTRICT_COORDS[key];
  if (hit) return hit;
  return { ...DEFAULT, label: params.district ?? DEFAULT.label };
}

export async function fetchWeatherForecast(coords: {
  lat: number;
  lon: number;
  label: string;
}): Promise<WeatherForecast> {
  const base: WeatherForecast = {
    lat: coords.lat,
    lon: coords.lon,
    locationLabel: coords.label,
    rainMmToday: 0,
    rainMmTomorrow: 0,
    maxTempCToday: 28,
    avgHumidityPct: 70,
    heavyRainLikely: false,
    highHeatLikely: false,
    highHumidityLikely: false,
    weatherRiskScore: 35,
  };

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set(
      'daily',
      'precipitation_sum,temperature_2m_max,relative_humidity_2m_mean'
    );
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('timezone', 'Asia/Kolkata');

    const res = await fetch(url.toString());
    if (!res.ok) return base;

    const data = (await res.json()) as {
      daily?: {
        precipitation_sum?: number[];
        temperature_2m_max?: number[];
        relative_humidity_2m_mean?: number[];
      };
    };

    const rain0 = Number(data.daily?.precipitation_sum?.[0] ?? 0);
    const rain1 = Number(data.daily?.precipitation_sum?.[1] ?? 0);
    const temp = Number(data.daily?.temperature_2m_max?.[0] ?? 28);
    const humidity = Number(data.daily?.relative_humidity_2m_mean?.[0] ?? 70);

    const heavyRainLikely = rain0 >= 10 || rain1 >= 15;
    const highHeatLikely = temp >= 34;
    const highHumidityLikely = humidity >= 82;

    const weatherRiskScore = Math.min(
      100,
      Math.round(
        rain0 * 4 +
          rain1 * 2 +
          Math.max(0, humidity - 75) * 1.2 +
          Math.max(0, temp - 30) * 6
      )
    );

    return {
      lat: coords.lat,
      lon: coords.lon,
      locationLabel: coords.label,
      rainMmToday: rain0,
      rainMmTomorrow: rain1,
      maxTempCToday: temp,
      avgHumidityPct: humidity,
      heavyRainLikely,
      highHeatLikely,
      highHumidityLikely,
      weatherRiskScore,
    };
  } catch {
    return base;
  }
}
