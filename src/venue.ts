// OCT-LOFT north district, beside B10 Live. Amap tiles and the outbound
// Amap link use the converted GCJ-02 point.
const VENUE_WGS84 = {
  lat: 22.5432,
  lng: 113.9872,
};

const VENUE_LABEL = "华侨城创意园C2空间";
const VENUE_ADDRESS =
  "广东省深圳市南山区沙河街道香山街社区香山东街2号东部工业区C2栋";

const PI = Math.PI;
const EARTH_A = 6378245.0;
const EARTH_EE = 0.00669342162296594323;

function outOfChina(lng: number, lat: number) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number) {
  let value =
    -100 +
    2 * lng +
    3 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  value +=
    ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  value +=
    ((20 * Math.sin(lat * PI) + 40 * Math.sin((lat / 3) * PI)) * 2) / 3;
  value +=
    ((160 * Math.sin((lat / 12) * PI) +
      320 * Math.sin((lat * PI) / 30)) *
      2) /
    3;
  return value;
}

function transformLng(lng: number, lat: number) {
  let value =
    300 +
    lng +
    2 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng));
  value +=
    ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  value +=
    ((20 * Math.sin(lng * PI) + 40 * Math.sin((lng / 3) * PI)) * 2) / 3;
  value +=
    ((150 * Math.sin((lng / 12) * PI) +
      300 * Math.sin((lng / 30) * PI)) *
      2) /
    3;
  return value;
}

function wgs84ToGcj02(lng: number, lat: number) {
  if (outOfChina(lng, lat)) {
    return { lat, lng };
  }

  let deltaLat = transformLat(lng - 105, lat - 35);
  let deltaLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EARTH_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);

  deltaLat =
    (deltaLat * 180) /
    (((EARTH_A * (1 - EARTH_EE)) / (magic * sqrtMagic)) * PI);
  deltaLng =
    (deltaLng * 180) / ((EARTH_A / sqrtMagic) * Math.cos(radLat) * PI);

  return {
    lat: lat + deltaLat,
    lng: lng + deltaLng,
  };
}

const VENUE_GCJ02 = wgs84ToGcj02(VENUE_WGS84.lng, VENUE_WGS84.lat);

export const VENUE = {
  label: VENUE_LABEL,
  address: VENUE_ADDRESS,
  wgs84: VENUE_WGS84,
  gcj02: VENUE_GCJ02,
  amapUrl:
    `https://uri.amap.com/marker?position=${VENUE_GCJ02.lng.toFixed(6)},` +
    `${VENUE_GCJ02.lat.toFixed(6)}&name=${encodeURIComponent(VENUE_LABEL)}` +
    "&src=activity-66-portal&coordinate=gaode&callnative=1",
} as const;
