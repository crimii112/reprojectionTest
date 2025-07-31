import { useContext, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, Polygon } from 'ol/geom';
import { asArray } from 'ol/color';
import { Circle, Fill, RegularShape, Stroke, Style } from 'ol/style';
import { Feature } from 'ol';
import HeatmapLayer from 'ol/layer/Heatmap';
import { get as getProjection, transform } from 'ol/proj';

import MapContext from '@/components/map/MapContext';

const ProjectionTest = ({ SetMap, mapId }) => {
  const map = useContext(MapContext);
  const FIXED_GEOGRAPHIC_RADIUS_DEGREE = 0.1;
  const FIXED_GEOGRAPHIC_RADIUS_METERS = 10000;

  const sourceCoords = new VectorSource({ wrapX: false });
  const layerCoords = new VectorLayer({
    source: sourceCoords,
    id: 'coords',
    zIndex: 1000,
  });

  const sourceArrows = new VectorSource({ wrapX: false });
  const layerArrows = new VectorLayer({
    source: sourceArrows,
    id: 'arrows',
    zIndex: 10000,
  });

  const shaft = new RegularShape({
    points: 2,
    radius: 5,
    stroke: new Stroke({
      width: 2,
      color: 'black',
    }),
    rotateWithView: true,
  });

  const head = new RegularShape({
    points: 3,
    radius: 5,
    fill: new Fill({
      color: 'black',
    }),
    rotateWithView: true,
  });

  const styles = [new Style({ image: shaft }), new Style({ image: head })];

  const customProj = getProjection('CUSTOM');

  useEffect(() => {
    if (!map.ol_uid) return;

    if (SetMap) SetMap(map);

    map.addLayer(layerCoords);
    map.addLayer(layerArrows);

    getTempData();

    map.getView().on('change:resolution', updateHeatmapRadius);
  }, [map, map.ol_uid]);

  const getInterpolateColor = (min, max, color, value) => {
    if (value < min || value > max) {
      return 'rgba(0, 0, 0, 0)'; // 범위를 벗어난 값은 투명색으로 처리
    }

    const sColorArr = asArray(color[0]);
    const eColorArr = asArray(color[1]);

    const ratio = (value - min) / (max - min);
    const r = Math.round(sColorArr[0] + ratio * (eColorArr[0] - sColorArr[0]));
    const g = Math.round(sColorArr[1] + ratio * (eColorArr[1] - sColorArr[1]));
    const b = Math.round(sColorArr[2] + ratio * (eColorArr[2] - sColorArr[2]));

    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  };

  const setPointFeatureStyle = f => {
    const value = f.get('value');
    const style = tmpStyles.find(s => value >= s.min && value < s.max);
    if (style) {
      f.setStyle(
        new Style({
          image: new Circle({
            radius: style.circleRadius,
            fill: new Fill({
              color: getInterpolateColor(
                style.min,
                style.max,
                style.gradient,
                value
              ),
            }),
            stroke: new Stroke({
              color: style.circleStrokeColor,
              width: style.circleStrokeWidth,
            }),
          }),
        })
      );
    }
  };

  const setPolygonFeatureStyle = f => {
    const value = f.get('value');
    const style = tmpStyles.find(s => value >= s.min && value < s.max);
    if (style) {
      f.setStyle(
        new Style({
          fill: new Fill({
            color: getInterpolateColor(
              style.min,
              style.max,
              style.gradient,
              value
            ),
          }),
          // stroke: new Stroke({
          //   color: style.circleStrokeColor,
          //   width: style.circleStrokeWidth,
          // }),
        })
      );
    }
  };

  const getTempData = async () => {
    document.body.style.cursor = 'progress';

    await axios
      .post(`${import.meta.env.VITE_WIND_API_URL}/api/proj/test`, {
        arrowGap: 3,
      })
      .then(res => res.data)
      .then(data => {
        console.log(data);

        if (!data.heatmapData) return;

        // 좌표 데이터 Point Feature 생성
        const features = data.heatmapData.map(item => {
          const feature = new Feature({
            geometry: new Point([item.lon, item.lat]),
            // geometry: new Point(
            //   transform([item.lon, item.lat], 'EPSG:4326', customProj)
            // ),
            value: item.value,
          });
          return feature;
        });

        // const features = [];
        // for (let i = 0; i < 100; i++) {
        //   const item = data.heatmapData[i];
        //   const feature = new Feature({
        //     geometry: new Point([item.lon, item.lat]),
        //     // geometry: new Point(
        //     //   transform([item.lon, item.lat], 'EPSG:4326', customProj)
        //     // ),
        //     value: item.value,
        //   });
        //   features.push(feature);
        // }

        // features.forEach(f => setPointFeatureStyle(f));
        // sourceCoords.addFeatures(features);

        // 좌표 데이터 Polygon Feature 생성
        const polygonFeatures = data.heatmapData.map(item => {
          const feature = new Feature({
            geometry: new Polygon([
              [
                [item.lon - 4500, item.lat + 4500],
                [item.lon - 4500, item.lat - 4500],
                [item.lon + 4500, item.lat - 4500],
                [item.lon + 4500, item.lat + 4500],
                [item.lon - 4500, item.lat + 4500],
              ],
            ]),
            value: item.value,
          });
          return feature;
        });

        polygonFeatures.forEach(f => setPolygonFeatureStyle(f));
        sourceCoords.addFeatures(polygonFeatures);

        const arrowFeatures = data.arrowData.map(item => {
          const feature = new Feature({
            geometry: new Point([item.lon, item.lat]),
            wd: item.wd,
            ws: item.ws,
          });
          return feature;
        });
        // arrowFeatures.forEach(f => setArrowFeatureStyle(f));
        sourceArrows.addFeatures(arrowFeatures);

        layerArrows.setStyle(f => {
          const wd = f.get('wd');
          const ws = f.get('ws');
          const angle = ((wd - 180) * Math.PI) / 180;
          const scale = ws / 10;
          shaft.setScale([1, scale]);
          shaft.setRotation(angle);
          head.setDisplacement([
            0,
            head.getRadius() / 2 + shaft.getRadius() * scale,
          ]);
          head.setRotation(angle);
          return styles;
        });

        // heatmapLayer 생성(tmp)
        // tmpStyles.forEach(style => {
        //   const rangeFeatures = filterByRange(features, style.min, style.max);

        //   if (rangeFeatures.length > 0) {
        //     const layer = createHeatmapLayer(rangeFeatures, style.gradient);
        //     map.addLayer(layer);
        //   }
        // });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
      });

    document.body.style.cursor = 'default';
  };

  // heatmapIntervals 범위에 맞는 features 찾기
  const filterByRange = (features, min, max) => {
    return features
      .filter(f => {
        const v = f.get('value');
        return v >= min && v < max;
      })
      .map(f => {
        const v = f.get('value');
        const weight = (v - min) / (max - min);
        f.set('weight', weight); // Heatmap weight을 고정
        return f;
      });
  };

  // 히트맵 반경 업데이트 함수(해상도 변화 시 동적 재조정)
  const updateHeatmapRadius = () => {
    if (!map) return;

    const view = map.getView();
    const resolution = view.getResolution();
    if (!resolution) return;

    const radiusInPixels = FIXED_GEOGRAPHIC_RADIUS_METERS / resolution; // view => 'CUSTOM'
    // const radiusInPixels = FIXED_GEOGRAPHIC_RADIUS_DEGREE / resolution; // view => 'EPSG:4326'

    map
      .getLayers()
      .getArray()
      .forEach(layer => {
        if (layer instanceof HeatmapLayer) {
          layer.setRadius(radiusInPixels);
          layer.setBlur(radiusInPixels);
        }
      });
  };

  // heatmapLayer 생성 함수
  const createHeatmapLayer = (features, gradient) => {
    return new HeatmapLayer({
      source: new VectorSource({
        features: features,
      }),
      gradient: gradient,
      opacity: 0.6,
      radius: 25, // 히트맵 반경
      blur: 25, // 히트맵 블러 효과
    });
  };

  return <Container id={mapId} />;
};

export { ProjectionTest };

const tmpStyles = [
  {
    min: 0,
    max: 10,
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
    min: 10,
    max: 20,
    circleRadius: 5,
    circleFillColor: 'rgba(0, 128, 0, 1)',
    circleStrokeColor: 'gray',
    circleStrokeWidth: 1,
    gradient: [
      // 'rgba(180, 255, 180, 1)', // 연초록
      'rgba(255, 255, 255, 1)',
      'rgba(0, 128, 0, 1)', // 진초록
    ],
  },
  {
    min: 20,
    max: 30,
    circleRadius: 4,
    circleFillColor: 'rgba(255, 200, 0, 1)',
    circleStrokeColor: 'gray',
    circleStrokeWidth: 1,
    gradient: [
      // 'rgba(255, 245, 180, 1)', // 연노랑
      'rgba(255, 255, 255, 1)',
      'rgba(255, 200, 0, 1)', // 진노랑
    ],
  },
  {
    min: 30,
    max: 40,
    circleRadius: 5,
    circleFillColor: 'rgba(200, 0, 0, 1)',
    circleStrokeColor: 'rgba(255, 180, 180, 1)',
    circleStrokeWidth: 1,
    gradient: [
      'rgba(255, 180, 180, 1)', // 연빨강
      'rgba(200, 0, 0, 1)', // 진빨강
    ],
  },
];

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
`;
