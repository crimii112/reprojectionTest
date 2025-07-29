import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import _ from 'lodash';
import { transform } from 'ol/proj';
import { products } from '@/earth/1.0.0/products.js'; // products.js에서 buildGrid와 FACTORIES를 import
import { µ } from '@/earth/1.0.0/micro.js';

import MapContext from '@/components/map/MapContext';
import { WindCanvas } from '@/components/earth/wind';

const EarthTest = ({ SetMap, mapId }) => {
  const map = useContext(MapContext);
  const [currentGrid, setCurrentGrid] = useState(null); // products.js에서 생성될 그리드 데이터
  const [bounds, setBounds] = useState(null);
  const boundsRef = useRef({});
  const fieldRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!map.ol_uid) return;

    if (SetMap) SetMap(map);

    // 맵 뷰포트 크기 감지 및 업데이트
    const updateViewSize = () => {
      setBounds({
        x: 0,
        y: 0,
        xMax: map.getViewport().offsetWidth - 1,
        yMax: map.getViewport().offsetHeight - 1,
        width: map.getViewport().offsetWidth,
        height: map.getViewport().offsetHeight,
      });
    };

    // 초기 크기 설정
    updateViewSize();
    // 맵 크기 변경 시 이벤트 리스너 등록
    map.on('rendercomplete', updateViewSize); // 렌더링 완료 시 뷰포트 크기 업데이트

    // 클린업 함수
    return () => {
      map.un('rendercomplete', updateViewSize);
    };
  }, [map, map.ol_uid]);

  const getWindData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_WIND_API_URL}/api/proj/test`
      );
      const data = res.data;

      console.log('Fetched wind data:', data);

      if (!data.windData) {
        console.warn('API returned unexpected wind data format:', data);
        setError('바람 데이터 형식이 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      // products.js의 builder 함수를 사용하여 그리드 생성
      // 이 부분은 API에서 받아오는 windData의 실제 구조에 따라 달라질 수 있습니다.
      // 예를 들어 GFS 데이터라면 products.FACTORIES.wind.builder를 사용합니다.
      // `data.windData`가 이미 { header, data } 형태라고 가정.
      const attr = { param: 'wind', surface: 'surface', level: 'surface' };
      const windProduct = products.FACTORIES.wind.create(attr);
      const windBuilder = windProduct.builder(data.windData);

      const builtGrid = products.buildGrid(windBuilder); // products.js의 buildGrid 함수 사용

      // particle config는 products.FACTORIES.wind에서 가져옵니다.
      const particleConfig = windProduct.particles; //{ velocityScale: 1 / 60000, maxIntensity: 17 }
      const colorScale = windProduct.scale.gradient;

      setCurrentGrid({
        ...builtGrid,
        particles: particleConfig, // 입자 애니메이션 설정을 그리드에 추가
        scale: { gradient: colorScale }, // 색상 스케일도 추가
      });
    } catch (err) {
      console.error('Error fetching or processing wind data:', err);
      setError('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
      alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const distortion = (λ, φ, x, y) => {
    const H = 0.000036;

    const hλ = λ < 0 ? H : -H;
    const hφ = φ < 0 ? H : -H;
    const coordCustom1 = transform([λ + hλ, φ], 'EPSG:4326', 'CUSTOM');
    const coordCustom2 = transform([λ, φ + hφ], 'EPSG:4326', 'CUSTOM');
    const pλ = map.getPixelFromCoordinate(coordCustom1);
    const pφ = map.getPixelFromCoordinate(coordCustom2);

    // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1° λ
    // changes depending on φ. Without this, there is a pinching effect at the poles.
    const τ = 2 * Math.PI;
    const k = Math.cos((φ / 360) * τ);

    return [
      (pλ[0] - x) / hλ / k,
      (pλ[1] - y) / hλ / k,
      (pφ[0] - x) / hφ,
      (pφ[1] - y) / hφ,
    ];
  };

  const distort = (λ, φ, x, y, scale, wind) => {
    const u = wind[0] * scale;
    const v = wind[1] * scale;
    const d = distortion(λ, φ, x, y);

    wind[0] = d[0] * u + d[2] * v;
    wind[1] = d[1] * u + d[3] * v;

    return wind;
  };

  const columnsRef = useRef([]);
  const interpolateColumn = x => {
    const velocityScale =
      bounds.height * currentGrid.particles.velocityScale * 0.5;
    let column = [];
    for (let y = bounds.y; y <= bounds.yMax; y += 1) {
      const point = [x, y];
      const coordCustom = map.getCoordinateFromPixel(point);
      const coord4326 = transform(coordCustom, 'CUSTOM', 'EPSG:4326');
      let wind = null;
      if (coord4326) {
        const λ = coord4326[0];
        const φ = coord4326[1];
        if (isFinite(λ)) {
          wind = currentGrid.interpolate(λ, φ);
          if (wind) {
            wind = distort(λ, φ, x, y, velocityScale, wind);
          }
        }
      }

      // column[y + 1] = column[y] = wind || [NaN, NaN, null];
      column[y] = wind || [NaN, NaN, null];
    }

    columnsRef.current[x] = column;
    // columnsRef.current[x + 1] = columnsRef.current[x] = column;
  };

  const NULL_WIND_VECTOR = [NaN, NaN, null];
  const createField = (columns, bounds) => {
    const field = (x, y) => {
      let column = columns[Math.round(x)];
      return (column && column[Math.round(y)]) || [NaN, NaN, null];
    };

    field.isDefined = (x, y) => {
      return field(x, y)[2] !== null;
    };

    field.isInsideBoundary = (x, y) => {
      return field(x, y) !== NULL_WIND_VECTOR;
    };

    field.release = () => {
      columns = [];
    };

    field.randomize = o => {
      let x, y;
      let safetyNet = 0;
      do {
        x = Math.round(_.random(bounds.x, bounds.xMax, true));
        y = Math.round(_.random(bounds.y, bounds.yMax, true));
      } while (!field.isDefined(x, y) && safetyNet++ < 30);

      o.x = x;
      o.y = y;
      return o;
    };

    return field;
  };

  const batchInterpolate = () => {
    if (!currentGrid || !bounds) return;

    try {
      const start = Date.now();
      let x = bounds.x;
      while (x < bounds.xMax) {
        interpolateColumn(x);
        x += 1;
        // if (Date.now() - start > 500) {
        //   console.log('.......');
        //   setTimeout(batchInterpolate, 25);
        //   return;
        // }
      }

      const field = createField(columnsRef.current, bounds);
      fieldRef.current = field;
    } catch (e) {
      console.log('Error batching interpolate: ' + e);
    }
  };

  useEffect(() => {
    if (!map.ol_uid) return;
    getWindData();
  }, [map.ol_uid, getWindData]);

  useEffect(() => {
    if (!map.ol_uid) return;
    batchInterpolate();
  }, [map.ol_uid, batchInterpolate]);

  return (
    <Container id={mapId}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 1000,
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '10px',
          }}
        >
          바람 데이터 로딩 중...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 1000,
            color: 'red',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '10px',
          }}
        >
          {error}
        </div>
      )}

      {/* WindCanvas 컴포넌트를 OpenLayers 맵 위에 오버레이 */}
      {currentGrid && bounds && fieldRef.current && map.ol_uid && (
        <WindCanvas
          key={bounds.width + ':' + bounds.height}
          currentGrid={currentGrid}
          currentField={fieldRef.current}
          bounds={bounds}
        />
      )}
    </Container>
  );
};

export { EarthTest };

const Container = styled.div`
  width: 100%;
  height: 100%;

  .ol-viewport canvas {
    image-rendering: pixelated;
  }

  // 국토정보지리원 로고
  .ol-attribution {
    width: 96px;
    height: 16px;
    top: 96%;
    right: 2%;

    ul {
      margin: 0;
      padding: 0;
    }
    li {
      list-style-type: none;
    }
    button {
      display: none;
    }
  }
  .ol-control {
    position: absolute;
    line-height: normal;
  }

  // 줌 컨트롤러
  .ol-zoom {
    position: absolute;
    width: 50px;
    top: 90px;
    right: 20px;
    padding: 0;
    margin: 0;
    background: #000000;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1px;

    .ol-zoom-in,
    .ol-zoom-out {
      width: 100%;
      height: 24px;
      padding: 0;
      background: #ffffff;
      border: none;
      font-weight: bold;
      color: #333;
      cursor: pointer;
    }
    .ol-zoom-in {
      border-radius: 2px 2px 0 0;
    }
    .ol-zoom-out {
      border-radius: 0 0 2px 2px;
    }
    .ol-zoom-in.ol-has-tooltip:hover[role='tooltip'],
    .ol-zoom-in.ol-has-tooltip:focus[role='tooltip'] {
      top: 3px;
    }
    .ol-zoom-out.ol-has-tooltip:hover [role='tooltip'],
    .ol-zoom-out.ol-has-tooltip:focus [role='tooltip'] {
      top: 232px;
    }
  }

  // 배경지도
  .gis-control-container {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    font-family: 'Pretendard GOV Variable', 'Pretendard GOV', sans-serif;

    .gis-control {
      button {
        box-sizing: border-box;
        width: 50px;
        height: 50px;
        padding: 3px;
        background: #ffffff;
        border-radius: 3px 5px;
        border: none;
        font-size: 11px;
        line-height: 14px;
        color: #333;
        cursor: pointer;
      }
    }
    .gis-list {
      position: absolute;
      right: 100%;
      top: auto;
      width: 76px;
      height: 0;
      margin-top: 12px;
      padding-right: 10px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.3s;

      button {
        position: static;
        width: 100%;
        margin: 0;
        padding: 0;
        padding-bottom: 1px;
        background: #333;
        border-radius: 0;
        border: none;
        outline: none;
        font-size: 11px;
        line-height: 33px;
        text-align: center;
        color: #999;
        cursor: pointer;
        overflow: hidden;
      }
      button:hover {
        background: #222;
        color: #ff96a3;
      }
    }
    .gis-list:after {
      position: absolute;
      width: 0;
      height: 0;
      top: 15px;
      right: 0px;
      border: 5px solid transparent;
      border-left-color: #333;
      display: block;
      content: '';
    }
    .gis-list.active {
      height: calc(36px * 3 - 1px);
    }
  }

  // 범례
  .ol-legend.ol-legend-right {
    width: fit-content;
    padding: 0 10px 0 0;
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    background-color: rgba(255, 255, 255, 0.8);
    font-family: 'Pretendard GOV Variable', 'Pretendard GOV', sans-serif;

    button {
      outline: none;
      margin: 1px;
      padding: 0;
      color: var(--ol-subtle-foreground-color);
      font-weight: bold;
      text-decoration: none;
      font-size: inherit;
      text-align: center;
      height: 1.375em;
      width: 1.375em;
      line-height: 0.4em;
      background-color: var(--ol-background-color);
      border: none;
      border-radius: 2px;
    }
  }
  .ol-legend.ol-legend-right.active {
    display: block;
  }

  // 2025-01-07 추가
  .hidden {
    display: none;
  }
`;
