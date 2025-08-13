import { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, Polygon } from 'ol/geom';
import { asArray } from 'ol/color';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { Feature } from 'ol';

import MapContext from '@/components/map/MapContext';
import { Option, Select } from '@/components/ui/select-box';
import { Button, GridWrapper } from '@/components/ui/common';
import { toContext } from 'ol/render';

/**
 * - 소장님 모델 좌표계 적용 => 격자 폴리곤, 바람 화살표 레이어
 */
const ProjectionTestLcc = ({ SetMap, mapId }) => {
  const map = useContext(MapContext);

  const [bgPoll, setBgPoll] = useState('O3');
  const [arrowGap, setArrowGap] = useState(3);

  const arrowImgRef = useRef(null);

  const sourceCoordsRef = useRef(new VectorSource({ wrapX: false }));
  const sourceCoords = sourceCoordsRef.current;
  const layerCoords = new VectorLayer({
    source: sourceCoords,
    id: 'coords',
    zIndex: 1000,
  });

  const sourceArrowsRef = useRef(new VectorSource({ wrapX: false }));
  const sourceArrows = sourceArrowsRef.current;
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

  useEffect(() => {
    if (!map.ol_uid) return;

    if (SetMap) SetMap(map);

    map.addLayer(layerCoords);
    map.addLayer(layerArrows);

    // getLccData(arrowGap);

    return () => {
      sourceArrows.clear();
      layerArrows.getSource().clear();
      sourceCoords.clear();
      layerCoords.getSource().clear();
    };
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

    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  };

  const setPolygonFeatureStyle = f => {
    const value = f.get('value');

    // 1. 보간 방식
    // const style = polygonStyles[bgPoll].find(
    //   s => value >= s.min && value < s.max
    // );
    // if (style) {
    //   f.setStyle(
    //     new Style({
    //       fill: new Fill({
    //         color: getInterpolateColor(
    //           style.min,
    //           style.max,
    //           style.gradient,
    //           value
    //         ),
    //       }),
    //     })
    //   );
    // }

    // 2. 색상 지정 방식
    const style = o3Rgb.find(s => value >= s.min && value < s.max);
    if (style) {
      f.setStyle(
        new Style({
          fill: new Fill({
            color: style.color,
          }),
        })
      );
    }
  };

  const getLccData = async (gap = arrowGap) => {
    sourceArrows.clear();
    layerArrows.getSource().clear();
    sourceCoords.clear();
    layerCoords.getSource().clear();

    document.body.style.cursor = 'progress';

    await axios
      .post(`${import.meta.env.VITE_WIND_API_URL}/api/lcc`, {
        bgPoll: bgPoll,
        arrowGap: gap,
      })
      .then(res => res.data)
      .then(data => {
        console.log(data);

        if (!data.polygonData) return;

        // 좌표 데이터 Polygon Feature 생성
        const polygonFeatures = data.polygonData.map(item => {
          const feature = new Feature({
            geometry: new Polygon([
              [
                // [item.lon - 4500, item.lat + 4500],
                // [item.lon - 4500, item.lat - 4500],
                // [item.lon + 4500, item.lat - 4500],
                // [item.lon + 4500, item.lat + 4500],
                // [item.lon - 4500, item.lat + 4500],
                [item.lon - 13500, item.lat + 13500],
                [item.lon - 13500, item.lat - 13500],
                [item.lon + 13500, item.lat - 13500],
                [item.lon + 13500, item.lat + 13500],
                [item.lon - 13500, item.lat + 13500],
              ],
            ]),
            value: item.value,
          });
          return feature;
        });

        polygonFeatures.forEach(f => setPolygonFeatureStyle(f));
        sourceCoords.addFeatures(polygonFeatures);

        if (!data.arrowData) return;

        // 바람 화살표
        const arrowFeatures = data.arrowData.map(item => {
          const feature = new Feature({
            geometry: new Point([item.lon, item.lat]),
            wd: item.wd,
            ws: item.ws,
          });
          return feature;
        });
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
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        alert('데이터를 가져오는 데 실패했습니다. 나중에 다시 시도해주세요.');
      });

    document.body.style.cursor = 'default';
  };

  // zoom 크기에 따라 gap 자동 조절
  const gapForZoom = z => (z <= 3 ? 4 : z <= 4 ? 3 : z <= 5 ? 2 : 1);

  useEffect(() => {
    if (!map.ol_uid) return;

    const onMoveEnd = () => {
      const res = map.getView().getZoom();
      const gap = gapForZoom(res);
      console.log(`zoom: ${res}, gap: ${gap}`);

      setArrowGap(gap);
      getLccData(gap);
    };

    map.on('moveend', onMoveEnd);
  }, [map]);

  return (
    <Container id={mapId}>
      <SettingContainer>
        <GridWrapper className="grid-cols-[1fr_2fr] gap-1">
          <span className="flex items-center justify-center text-sm">
            배경 물질
          </span>
          <Select
            className="text-sm"
            defaultValue={bgPoll}
            onChange={e => setBgPoll(e.target.value)}
          >
            <Option value="O3">O3</Option>
            <Option value="PM10">PM10</Option>
            <Option value="PM2.5">PM2.5</Option>
          </Select>
        </GridWrapper>
        <GridWrapper className="grid-cols-[1fr_2fr] gap-1">
          <span className="flex items-center justify-center text-sm">
            바람 간격
          </span>
          <Select
            className="text-sm"
            value={arrowGap}
            onChange={e => {
              setArrowGap(Number(e.target.value));
            }}
          >
            <Option value="1">1</Option>
            <Option value="2">2</Option>
            <Option value="3">3</Option>
            <Option value="4">4</Option>
          </Select>
        </GridWrapper>
        <Button className="text-sm" onClick={() => getLccData(arrowGap)}>
          적용
        </Button>
      </SettingContainer>
      {/* <HeatmapLegend
        intervals={polygonStyles[bgPoll]}
        title={bgPoll}
        visible={true}
      /> */}
      <PolygonLegend />
    </Container>
  );
};

export { ProjectionTestLcc };

const PolygonLegend = ({}) => {
  return (
    <LegendContainer>
      <LegendTitle>O3</LegendTitle>
      {o3Rgb.toReversed().map(item => (
        <div className="flex flex-row items-end gap-1 h-5" key={item.min}>
          <div className="w-6 h-full" style={{ backgroundColor: item.color }} />
          <span className="text-sm leading-none translate-y-[5px]">
            {item.min.toFixed(3)}
          </span>
        </div>
      ))}
      <br />
      <LegendTitle>WS(m/s)</LegendTitle>
      {arrowLegendDatas.map(item => (
        <LegendItem key={item.ws}>
          <ArrowImg ws={item.ws} />
          <RangeLabel>{Number(item.ws).toFixed(1)}</RangeLabel>
        </LegendItem>
      ))}
    </LegendContainer>
  );
};

// 히트맵 범례
const HeatmapLegend = ({ intervals, title, visible }) => {
  return (
    <LegendContainer className={visible ? '' : 'hidden'}>
      <LegendTitle>{title.toUpperCase()}</LegendTitle>
      {intervals
        .slice()
        .reverse()
        .map((interval, idx) => (
          <LegendItem key={idx}>
            <ColorBox
              style={{
                background: `linear-gradient(to right, ${interval.gradient.join(
                  ', '
                )})`,
              }}
            />
            <RangeLabel>
              {interval.min} ~ {interval.max}
            </RangeLabel>
          </LegendItem>
        ))}
      <br />
      <LegendTitle>WS(m/s)</LegendTitle>
      {arrowLegendDatas.map(item => (
        <LegendItem key={item.ws}>
          <ArrowImg ws={item.ws} />
          <RangeLabel>{Number(item.ws).toFixed(1)}</RangeLabel>
        </LegendItem>
      ))}
    </LegendContainer>
  );
};

const ArrowImg = ({ ws }) => {
  const arrowImgRef = useRef(null);

  useEffect(() => {
    const canvas = arrowImgRef.current;
    if (!canvas) return;

    const size = 20;
    const pr = window.devicePixelRatio || 1;
    canvas.width = size * pr;
    canvas.height = size * pr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.style.marginRight = `10px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    const angle = ((270 - 180) * Math.PI) / 180; // 오른쪽 수평
    const scale = ws / 10;
    shaft.setScale([1, scale]);
    shaft.setRotation(angle);
    head.setDisplacement([0, head.getRadius() / 2 + shaft.getRadius() * scale]);
    head.setRotation(angle);

    const vc = toContext(ctx, {
      size: [canvas.width, canvas.height],
      pixelRatio: pr,
    });
    vc.setStyle(new Style({ image: shaft }));
    vc.drawGeometry(new Point([canvas.width / 2, canvas.height / 2]));
    vc.setStyle(new Style({ image: head }));
    vc.drawGeometry(new Point([canvas.width / 2, canvas.height / 2]));
  }, []);

  return <canvas ref={arrowImgRef} />;
};

const arrowLegendDatas = [
  { ws: 1.0 },
  { ws: 3.0 },
  { ws: 5.0 },
  { ws: 7.0 },
  { ws: 9.0 },
];

const o3Rgb = [
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
];
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
