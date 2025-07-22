// import { useEffect, useRef } from 'react';

// import { windIntensityColorScale } from './micro';
// import { buildGrid } from './projucts';
// import _ from 'lodash';

// const WindCanvas = ({ windData, width, height, toLonLat }) => {
//   const canvasRef = useRef(null);
//   const animationId = useRef();
//   const particles = useRef([]);
//   const buckets = useRef([]);
//   const colorScale = useRef([]);

//   const INTENSITY_SCALE_STEP = 10;
//   const MAX_PARTICLE_AGE = 150;
//   const PARTICLE_MULTIPLIER = 7;
//   const fadeFillStyle = 'rgba(0, 0, 0, 0.85)';

//   useEffect(() => {
//     if (!windData || !windData[0] || !windData[1]) return;
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');

//     // grid 생성
//     const header = windData[0].header;
//     const uData = windData[0].data;
//     const vData = windData[1].data;
//     const grid = buildGrid(header, uData, vData);

//     const bounds = (colorScale.current = windIntensityColorScale(
//       INTENSITY_SCALE_STEP,
//       17
//     ));
//     buckets.current = colorScale.current.map(() => []);

//     const particleCount = Math.round(width * PARTICLE_MULTIPLIER);
//     console.log('particle count: ' + particleCount);

//     // particles 초기화
//     particles.current = Array.from({ length: particleCount }, p =>
//       randomizeParticle(p, grid, toLonLat)
//     );
//     console.log(particles.current);

//     const evolve = () => {
//       buckets.current.forEach(b => (b.length = 0));
//       particles.current.forEach(p => {
//         if (p.age > MAX_PARTICLE_AGE) {
//           Object.assign(p, randomizeParticle(p, grid, toLonLat));
//         }

//         const [lon, lat] = toLonLat(p.x, p.y);
//         const wind = grid.interpolate(lon, lat);

//         if (!wind) {
//           p.age = MAX_PARTICLE_AGE;
//           return;
//         }

//         const [u, v, m] = wind;
//         if (m == null) {
//           p.age = MAX_PARTICLE_AGE;
//           return;
//         }

//         const velocityScale = height * 0.0005; // 속도 스케일
//         const xt = p.x + u * velocityScale;
//         const yt = p.y - v * velocityScale;

//         const toLonLatResult = toLonLat(xt, yt);
//         if (!toLonLatResult) {
//           p.age = MAX_PARTICLE_AGE;
//           return;
//         }
//         const [lonT, latT] = toLonLatResult;
//         const windT = grid.interpolate(lonT, latT);
//         if (!windT) {
//           p.age = MAX_PARTICLE_AGE;
//           return;
//         }

//         p.xt = xt;
//         p.yt = yt;
//         p.age += 1;

//         buckets.current[colorScale.current.indexFor(m)].push(p);
//       });
//     };

//     ctx.lineWidth = 1;
//     ctx.fillStyle = fadeFillStyle;

//     /** draw step */
//     const draw = () => {
//       const prev = ctx.globalCompositeOperation;
//       ctx.globalCompositeOperation = 'destination-in';
//       ctx.fillRect(0, 0, width, height);
//       ctx.globalCompositeOperation = prev;

//       buckets.current.forEach((bucket, i) => {
//         if (!bucket.length) return;
//         ctx.beginPath();
//         ctx.strokeStyle = colorScale.current[i];
//         bucket.forEach(p => {
//           ctx.moveTo(p.x, p.y);
//           ctx.lineTo(p.xt, p.yt);
//           p.x = p.xt;
//           p.y = p.yt;
//         });
//         ctx.stroke();
//       });
//     };

//     /** animation loop */
//     const frame = () => {
//       evolve();
//       draw();
//       setTimeout(frame, 40);
//     };
//     animationId.current = requestAnimationFrame(frame);

//     return () => cancelAnimationFrame(animationId.current);
//   }, [windData, width, height, toLonLat]);

//   const randomizeParticle = (particle, grid, toLonLat) => {
//     let x, y;
//     let tries = 0;
//     do {
//       x = Math.round(_.random(0, width));
//       y = Math.round(_.random(0, height));

//       const lonLat = toLonLat(x, y);

//       const wind = grid.interpolate(lonLat[0], lonLat[1]);
//       if (wind && wind[2] != null) {
//         return { ...particle, x, y, age: _.random(MAX_PARTICLE_AGE) };
//       }
//       tries++;
//     } while (tries < 30);

//     return { ...particle, x, y, age: 0 };
//   };

//   return (
//     <canvas
//       ref={canvasRef}
//       width={width}
//       height={height}
//       style={{
//         width,
//         height,
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         pointerEvents: 'none',
//         zIndex: 3000,
//       }}
//     />
//   );
// };

// export { WindCanvas };

// src/components/earth/wind/index.jsx
import React, { useRef, useEffect, useCallback } from 'react';
import { transform } from 'ol/proj';
import _ from 'lodash'; // lodash는 그대로 사용하거나 유사한 유틸리티 함수로 대체
import { µ } from '@/earth/1.0.0/micro'; // micro.js에서 µ를 import

// 원래 earth.js에서 가져온 상수들 (적절히 조절 가능)
const OVERLAY_ALPHA = 0.4; // 0-1.0 범위로 조절 (원래는 0.4 * 255)
const MAX_PARTICLE_AGE = 100; // 입자 수명 프레임 수
const PARTICLE_LINE_WIDTH = 1.0; // 입자 선 굵기
const PARTICLE_MULTIPLIER = 1 / 10000; // 화면 면적당 입자 수 조절 (예: 7/3은 너무 많을 수 있음, 1/10000은 픽셀당 입자 수)
const PARTICLE_REDUCTION = 0.75;
const FRAME_RATE_MS = 40; // milliseconds per frame (약 25fps)
const HOLE_VECTOR = [NaN, NaN, null]; // products.js에서 사용되는 빈 값

function WindCanvas({ currentGrid, olMap, viewSize }) {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particlesRef = useRef([]);
  const frameCount = useRef(0);

  // particleConfig와 colorScale은 currentGrid prop에서 직접 가져옵니다.
  const particleConfig = currentGrid?.particles;
  const colorScale = currentGrid?.scale?.gradient || µ.windIntensityColorScale; // products.js에 정의된 스케일 사용

  const createParticle = useCallback(() => {
    // OpenLayers 뷰의 EPSG:5179 영역 내에서 무작위 좌표 생성 후 WGS84로 역변환
    const viewExtent = olMap.getView().calculateExtent(olMap.getSize()); // 맵 현재 보이는 extent (EPSG:5179)
    const randomX = _.random(viewExtent[0], viewExtent[2]);
    const randomY = _.random(viewExtent[1], viewExtent[3]);

    // EPSG:5179에서 WGS84로 변환
    const wgs84Coord = transform([randomX, randomY], 'EPSG:5179', 'EPSG:4326');

    return {
      lon: wgs84Coord[0], // 경도
      lat: wgs84Coord[1], // 위도
      age: _.random(0, MAX_PARTICLE_AGE), // 초기 수명 무작위 설정
      x: NaN, // 화면 X 픽셀 좌표
      y: NaN, // 화면 Y 픽셀 좌표
      vx: NaN, // 픽셀 속도 X
      vy: NaN, // 픽셀 속도 Y
      intensity: NaN, // 바람 강도 (색상에 사용)
    };
  }, [olMap]);

  const initParticles = useCallback(() => {
    // 뷰 크기에 따라 입자 수 계산
    if (viewSize.width === 0 || viewSize.height === 0) {
      particlesRef.current = [];
      return;
    }
    const particleCount = Math.round(
      viewSize.width * viewSize.height * PARTICLE_MULTIPLIER // PARTICLE_MULTIPLIER는 단위 면적당 입자 수로 조절
    );
    particlesRef.current = _.range(particleCount).map(createParticle);
    console.log(`Initialized ${particleCount} particles.`);
  }, [createParticle, viewSize]);

  useEffect(() => {
    initParticles();
  }, [initParticles, currentGrid]); // currentGrid나 뷰 크기 변경 시 입자 재초기화

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }
    const ctx = canvas.getContext('2d');

    // Canvas DPI 조정 (선명도 향상)
    const dpr = window.devicePixelRatio || 1;
    if (
      canvas.width !== viewSize.width * dpr ||
      canvas.height !== viewSize.height * dpr
    ) {
      canvas.width = viewSize.width * dpr;
      canvas.height = viewSize.height * dpr;
      ctx.scale(dpr, dpr);
    }

    // 캔버스 지우기 (투명도를 낮춰 이전 프레임을 희미하게 남김)
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - OVERLAY_ALPHA})`; // 검정색 배경에 투명도
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!currentGrid || !olMap) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }

    const particles = particlesRef.current;
    const velocityScale = particleConfig?.velocityScale || 0.01; // 바람 속도 스케일 (px/s)
    const maxIntensity = particleConfig?.maxIntensity || 15; // 최대 강도 (색상 스케일 매핑용)

    particles.forEach(p => {
      if (p.age > MAX_PARTICLE_AGE) {
        Object.assign(p, createParticle()); // 수명 만료 시 입자 재배치
      }

      // 1. 입자의 현재 WGS84 위치에서 바람 데이터 보간
      const v = currentGrid.interpolate(p.lon, p.lat); // v = [u, v, magnitude]

      if (!v || v[2] === null || v === HOLE_VECTOR) {
        p.age = MAX_PARTICLE_AGE; // 데이터 없는 구역이면 재배치
        return;
      }

      const windU_wgs84 = v[0]; // WGS84 기준 u 성분
      const windV_wgs84 = v[1]; // WGS84 기준 v 성분
      const intensity = v[2]; // 바람 강도 (magnitude)

      // 2. 바람 벡터를 EPSG:5179 공간으로 변환 (근사치, 정확한 벡터 변환은 복잡)
      // 여기서는 입자 이동 후 새 WGS84 좌표를 OpenLayers 픽셀로 변환하는 방식을 사용
      // 간단하게 지리적 이동량을 계산 (예시: dt는 1초 기준, 실제 프레임 타임에 맞춰 조절)
      const dt = FRAME_RATE_MS / 1000; // 프레임당 시간 (초)

      // 다음 WGS84 좌표 계산 (단순화: 실제로는 지구 곡률 및 투영 왜곡 고려)
      // H는 micro.js의 0.0000360°φ ~= 4m. 이 값을 사용하거나 더 정교한 계산 필요
      const H_DEG = µ.H * velocityScale * dt; // 바람 속도를 반영한 지리적 이동 단위 (도)

      // 아주 간단한 이동 계산. 실제 지구 곡면을 따라 이동하려면 더 복잡한 지오메트리 계산이 필요.
      // u, v가 m/s 단위라면, 이를 lat/lon의 degree 변화량으로 변환해야 함.
      // products.js의 builder가 u,v를 grid units per second로 정의했다면 그에 따름.
      let nextLon = p.lon + windU_wgs84 * H_DEG;
      let nextLat = p.lat + windV_wgs84 * H_DEG;

      // 경도 랩핑 (Wrap longitude around the globe)
      nextLon = µ.floorMod(nextLon + 180, 360) - 180;
      // 위도 클램핑 (Clamp latitude to poles)
      nextLat = µ.clamp(nextLat, -90, 90);

      const newWGS84Coord = [nextLon, nextLat];

      // 3. WGS84 -> EPSG:5179 -> 픽셀 좌표 변환
      const newEpsg5179Coord = transform(
        newWGS84Coord,
        'EPSG:4326',
        'EPSG:5179'
      );
      const newPixel = olMap.getPixelFromCoordinate(newEpsg5179Coord);

      // 맵 뷰포트 안에 있는지 확인
      if (
        newPixel[0] < 0 ||
        newPixel[0] > viewSize.width ||
        newPixel[1] < 0 ||
        newPixel[1] > viewSize.height
      ) {
        p.age = MAX_PARTICLE_AGE; // 화면 밖으로 나가면 재배치
        return;
      }

      // 이전 픽셀 위치 (선 그리기를 위함)
      const prevPixel = olMap.getPixelFromCoordinate(
        transform([p.lon, p.lat], 'EPSG:4326', 'EPSG:5179')
      );

      p.x = newPixel[0];
      p.y = newPixel[1];
      p.vx = newPixel[0] - prevPixel[0]; // 픽셀 단위의 속도
      p.vy = newPixel[1] - prevPixel[1];
      p.intensity = intensity;
      p.age++;

      // 4. 입자 그리기
      ctx.beginPath();
      ctx.lineWidth = PARTICLE_LINE_WIDTH;
      // products.js의 color scale 또는 micro.js의 windIntensityColorScale 사용
      const color = colorScale(
        µ.proportion(intensity, 0, maxIntensity),
        OVERLAY_ALPHA
      );
      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
        color[3] / 255
      })`;

      ctx.moveTo(prevPixel[0], prevPixel[1]); // 이전 위치에서 시작
      ctx.lineTo(p.x, p.y); // 현재 위치로 선 그리기
      ctx.stroke();
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [
    currentGrid,
    olMap,
    viewSize,
    createParticle,
    particleConfig,
    colorScale,
  ]);

  useEffect(() => {
    // 애니메이션 시작 및 클린업
    if (currentGrid && olMap && viewSize.width > 0 && viewSize.height > 0) {
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [animate, currentGrid, olMap, viewSize]);

  // 맵의 줌/이동 시 입자 재초기화 (필요에 따라)
  useEffect(() => {
    if (!olMap) return;
    const handleMoveEnd = () => {
      // 맵 이동/줌이 끝나면 입자들을 다시 뿌려주는 것이 자연스러울 수 있습니다.
      // initParticles(); // 이 부분은 성능에 따라 조절
    };
    olMap.on('moveend', handleMoveEnd);
    return () => {
      olMap.un('moveend', handleMoveEnd);
    };
  }, [olMap, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // 맵 상호작용을 방해하지 않도록
        zIndex: 1, // 맵 위에 오버레이
      }}
    />
  );
}

export { WindCanvas };
