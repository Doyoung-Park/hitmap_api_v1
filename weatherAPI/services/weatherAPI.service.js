require('dotenv').config();
const { CustomError } = require('../../utils/Error');
const axios = require('axios');

const { Weather } = require('../../models');

const {
  today_func,
  find_tide_observatory,
  find_wave_height_observatory,
} = require('../observatoryFunc/find_observatory');

const WeatherRepository = require('../repositories/weatherAPI.repository');
const weatherRepository = new WeatherRepository(Weather);

// data에서 지금날짜 기준 2일 후의 data까지 찾아오는 함수: open weather api 전용
const find_after2days_from_now_data = (weather_data, today, after2days_from_today) => {
  const now = weather_data.findIndex((data) => data.date >= today);
  const after2days_from_now = weather_data.findIndex((data) => data.date >= after2days_from_today);
  const result = weather_data.slice(now, after2days_from_now + 1);

  return result.map((data) => {
    return {
      post_id: data.post_id,
      temp: data.temp,
      wind_speed: data.wind_speed,
      wind_deg: data.wind_deg,
      date: data.date.split(' ')[1].split(':')[0],
    };
  });
};

// 날짜 생성 함수: open weather api 전용
const make_date_func = () => {
  const date = new Date();
  const year = date.getFullYear(); // 년
  const month = ('0' + (date.getMonth() + 1)).slice(-2); // 월
  const day = date.getDate(); // 일
  const hour = date.getHours(); // 시간

  const after2days = `${year}-${month}-${day + 2} 00:00:00`;
  const today = `${year}-${month}-${day} ${hour}:00:00`;
  const after2days_from_today = `${year}-${month}-${day + 2} ${hour}:00:00`;

  return {
    after2days: after2days,
    today: today,
    after2days_from_today: after2days_from_today,
  };
};

// open weather: 풍향, 풍속, 기온
const get_weather = async (lat, lon) => {
  const open_weather_API_URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&lang=kr&appid=${process.env.OPEN_WEATHER_API_KEYS}`;
  // console.log('make_date_func(): ', make_date_func());

  const weather_data = await weatherRepository.getWeatherData(make_date_func().after2days);

  if (weather_data.length === 0) {
    await weatherRepository.deleteWeatherData();

    await axios
      .get(open_weather_API_URL)
      .then(async (response) => {
        response.data.list.map(async (data) => {
          await weatherRepository.createWeatherData(data);
        });

        const weather_data = await weatherRepository.getWeatherData();

        const result = find_after2days_from_now_data(
          weather_data,
          make_date_func().today,
          make_date_func().after2days_from_today,
        );

        return result;
      })
      .catch((error) => {
        console.log('error: ', error);
        throw new CustomError(error);
      });
  } else {
    const weather_data = await weatherRepository.getWeatherData();

    const result = find_after2days_from_now_data(
      weather_data,
      make_date_func().today,
      make_date_func().after2days_from_today,
    );

    return result;
  }
};

// 바다누리: 조석 예보
const get_tide_info = async (lat, lon) => {
  const obs_post_id = await find_tide_observatory(lat, lon);
  const today = await today_func();

  const open_api = 'http://www.khoa.go.kr/api/oceangrid/tideObsPreTab/search.do?ServiceKey=';
  const service_key = `${process.env.OPEN_BADANURI_API_KEYS}`;
  const obs_code = `&ObsCode=${obs_post_id}`; // 관측소 번호
  const date = `&Date=${today}`; // 오늘 날짜

  const search_info = open_api + service_key + obs_code + date + `&ResultType=json`;

  const data = axios
    .get(search_info)
    .then((res) => {
      return res.data.result;
    })
    .catch((error) => {
      console.log(error);
    });

  return data;
};

// 바다누리: 파고
const get_wave_height_info = async (lat, lon) => {
  const obs_post_id = await find_wave_height_observatory(lat, lon);
  const today = await today_func();

  const open_api = 'http://www.khoa.go.kr/api/oceangrid/obsWaveHight/search.do?ServiceKey=';
  const service_key = `${process.env.OPEN_BADANURI_API_KEYS}`;
  const obs_code = `&ObsCode=${obs_post_id}`; // 관측소 번호
  const date = `&Date=${today}`; // 오늘 날짜

  const search_info = open_api + service_key + obs_code + date + `&ResultType=json`;

  const data = axios
    .get(search_info)
    .then((res) => {
      return res.data.result;
    })
    .catch((error) => {
      console.log(error);
    });

  return data;
};

module.exports = {
  get_weather,
  get_tide_info,
  get_wave_height_info,
};
