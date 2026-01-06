import { useContext, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { WindLayer } from 'ol-wind';

import MapContext from '@/components/map/MapContext';

/**
 * - utm 좌표계 적용 => 격자 폴리곤, 바람 화살표 레이어
 */
const ProjectionTestUtmOlWind = ({ SetMap, mapId }) => {
  const map = useContext(MapContext);

  useEffect(() => {
    if (!map.ol_uid) return;

    if (SetMap) SetMap(map);

    getUtmData();
  }, [map, map.ol_uid]);

  const getUtmData = async () => {
    document.body.style.cursor = 'progress';

    await axios
      .get(`${import.meta.env.VITE_WIND_API_URL}/api/utm/olwind`)
      .then(res => res.data)
      .then(data => {
        console.log(data);

        if (!data.windData) return;

        const windLayer = new WindLayer(data.windData, {
          forceRender: true,
          zIndex: 5000,
          windOptions: {
            velocityScale: 0.0003, // 바람 속도에 따라 움직이는 속도 배율 (기본: 0.005)
            paths: 7000, // 동시에 렌더링할 입자 수 (기본: 5000)
            lineWidth: 1, // 입자 선의 두께 (기본: 1)
            speedFactor: 1, // 입자 속도 배율 (velocityScale과 별개) (기본: 1)
            particleAge: 100, // 입자의 수명 (기본: 60)
          },
          colorScale: 'gray',
        });

        map.addLayer(windLayer);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
      });

    document.body.style.cursor = 'default';
  };

  return <Container id={mapId} />;
};

export { ProjectionTestUtmOlWind };

const rgbs = {
  O3: [
    {
      min: 0.0,
      max: 0.01,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.01,
      max: 0.02,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 0.02,
      max: 0.03,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 0.03,
      max: 0.04,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 0.04,
      max: 0.05,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 0.05,
      max: 0.06,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 0.06,
      max: 0.07,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 0.07,
      max: 0.08,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 0.08,
      max: 0.09,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 0.09,
      max: 0.1,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 0.1,
      max: 0.11,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 0.11,
      max: 0.12,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 0.12,
      max: 0.13,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 0.13,
      max: 0.14,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 0.14,
      max: 0.15,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 0.15,
      max: 0.16,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 0.16,
      max: 0.17,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 0.17,
      max: 0.18,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 0.18,
      max: 0.19,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 0.19,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  PM10: [
    {
      min: 0,
      max: 6,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 6,
      max: 18,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 18,
      max: 31,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 31,
      max: 40,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 40,
      max: 48,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 48,
      max: 56,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 56,
      max: 64,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 64,
      max: 72,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 72,
      max: 81,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 81,
      max: 93,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 93,
      max: 105,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 105,
      max: 117,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 117,
      max: 130,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 130,
      max: 142,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 142,
      max: 151,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 151,
      max: 191,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 191,
      max: 231,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 231,
      max: 271,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 271,
      max: 320,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 320,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  'PM2.5': [
    {
      min: 0,
      max: 5,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 5,
      max: 10,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 10,
      max: 16,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 16,
      max: 19,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 19,
      max: 22,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 22,
      max: 26,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 26,
      max: 30,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 30,
      max: 33,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 33,
      max: 36,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 36,
      max: 42,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 42,
      max: 48,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 48,
      max: 55,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 55,
      max: 62,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 62,
      max: 69,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 69,
      max: 76,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 76,
      max: 107,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 107,
      max: 138,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 138,
      max: 169,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 169,
      max: 200,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 200,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
};
const polygonStyles = {
  O3: [
    {
      min: 0,
      max: 0.0301,
      circleRadius: 5,
      circleFillColor: 'rgba(0, 100, 255, 1)',
      circleStrokeColor: 'rgba(180, 210, 255, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 210, 255, 1)', // 연파랑
        'rgba(0, 100, 255, 1)', // 진파랑
      ],
    },
    {
      min: 0.0301,
      max: 0.0901,
      circleRadius: 5,
      circleFillColor: 'rgba(0, 128, 0, 1)',
      circleStrokeColor: 'gray',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 255, 180, 1)', // 연초록
        // 'rgba(255, 255, 255, 1)',
        'rgba(0, 128, 0, 1)', // 진초록
      ],
    },
    {
      min: 0.0901,
      max: 0.1501,
      circleRadius: 4,
      circleFillColor: 'rgba(255, 200, 0, 1)',
      circleStrokeColor: 'gray',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 245, 180, 1)', // 연노랑
        // 'rgba(255, 255, 255, 1)',
        'rgba(255, 200, 0, 1)', // 진노랑
      ],
    },
    {
      min: 0.1501,
      max: 0.3001,
      circleRadius: 5,
      circleFillColor: 'rgba(200, 0, 0, 1)',
      circleStrokeColor: 'rgba(255, 180, 180, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 180, 180, 1)', // 연빨강
        'rgba(200, 0, 0, 1)', // 진빨강
      ],
    },
  ],
  PM10: [
    {
      min: 0,
      max: 31,
      circleRadius: 5,
      circleFillColor: 'rgba(0, 100, 255, 1)',
      circleStrokeColor: 'rgba(180, 210, 255, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 210, 255, 1)', // 연파랑
        'rgba(0, 100, 255, 1)', // 진파랑
      ],
    },
    {
      min: 31,
      max: 81,
      circleRadius: 5,
      circleFillColor: 'rgba(180, 255, 180, 1)',
      circleStrokeColor: 'rgba(0, 128, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 255, 180, 1)', // 연초록
        'rgba(0, 128, 0, 1)', // 진초록
      ],
    },
    {
      min: 81,
      max: 151,
      circleRadius: 5,
      circleFillColor: 'rgba(255, 245, 180, 1)',
      circleStrokeColor: 'rgba(255, 200, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 245, 180, 1)', // 연노랑
        'rgba(255, 200, 0, 1)', // 진노랑
      ],
    },
    {
      min: 151,
      max: 320,
      circleRadius: 5,
      circleFillColor: 'rgba(255, 180, 180, 1)',
      circleStrokeColor: 'rgba(200, 0, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 180, 180, 1)', // 연빨강
        'rgba(200, 0, 0, 1)', // 진빨강
      ],
    },
  ],
  'PM2.5': [
    {
      min: 0,
      max: 16,
      circleRadius: 5,
      circleFillColor: 'rgba(0, 100, 255, 1)',
      circleStrokeColor: 'rgba(180, 210, 255, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 210, 255, 1)', // 연파랑
        'rgba(0, 100, 255, 1)', // 진파랑
      ],
    },
    {
      min: 16,
      max: 36,
      circleRadius: 5,
      circleFillColor: 'rgba(180, 255, 180, 1)',
      circleStrokeColor: 'rgba(0, 128, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(180, 255, 180, 1)', // 연초록
        'rgba(0, 128, 0, 1)', // 진초록
      ],
    },
    {
      min: 36,
      max: 76,
      circleRadius: 5,
      circleFillColor: 'rgba(255, 245, 180, 1)',
      circleStrokeColor: 'rgba(255, 200, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 245, 180, 1)', // 연노랑
        'rgba(255, 200, 0, 1)', // 진노랑
      ],
    },
    {
      min: 76,
      max: 200,
      circleRadius: 5,
      circleFillColor: 'rgba(255, 180, 180, 1)',
      circleStrokeColor: 'rgba(200, 0, 0, 1)',
      circleStrokeWidth: 1,
      gradient: [
        'rgba(255, 180, 180, 1)', // 연빨강
        'rgba(200, 0, 0, 1)', // 진빨강
      ],
    },
  ],
};

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

const LegendContainer = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 2000;
  padding: 15px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 5px;
  font-family: sans-serif;
  box-shadow: 0 2px 4px #cccccc;
`;

const LegendTitle = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
`;

const ColorBox = styled.div`
  width: 70px;
  height: 16px;
  border: 1px solid #cccccc;
  margin-right: 6px;
`;

const RangeLabel = styled.span`
  font-size: 14px;
  font-variant-numeric: tabular-nums;
`;

const SettingContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 200px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: #ffffff;
  border-radius: 5px;
  border: 1px solid #cccccc;
`;
