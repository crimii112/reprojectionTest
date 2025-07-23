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
const PARTICLE_MULTIPLIER = 7; // 화면 면적당 입자 수 조절 (예: 7/3은 너무 많을 수 있음, 1/10000은 픽셀당 입자 수)
const PARTICLE_REDUCTION = 0.75;
const FRAME_RATE_MS = 40; // milliseconds per frame (약 25fps)
const HOLE_VECTOR = [NaN, NaN, null]; // products.js에서 사용되는 빈 값
const INTENSITY_SCALE_STEP = 10; // step size of particle intensity color scale

function WindCanvas({ currentGrid, olMap, viewSize }) {
  console.log(currentGrid, viewSize);

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

    const coord = [randomX, randomY];

    return {
      x: coord[0], // 경도
      y: coord[1], // 위도
      age: _.random(0, MAX_PARTICLE_AGE), // 초기 수명 무작위 설정
    };
  }, [olMap]);

  const initParticles = useCallback(() => {
    // 뷰 크기에 따라 입자 수 계산
    if (viewSize.width === 0 || viewSize.height === 0) {
      particlesRef.current = [];
      return;
    }
    const particleCount = Math.round(
      viewSize.width * PARTICLE_MULTIPLIER // PARTICLE_MULTIPLIER는 단위 면적당 입자 수로 조절
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

    if (!currentGrid || !olMap) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }

    const colorStyles = µ.windIntensityColorScale(
      INTENSITY_SCALE_STEP,
      currentGrid.particles.maxIntensity
    );
    const buckets = colorStyles.map(() => {
      return [];
    });
    const particleCount = Math.round(viewSize.width * PARTICLE_MULTIPLIER);
    const fadeFillStyle = 'rgba(0, 0, 0, 0.97';

    particlesRef.current = _.range(particleCount).map(createParticle);

    const evolve = () => {
      buckets.forEach(bucket => {
        bucket.length = 0;
      });

      const particles = particlesRef.current;
      const velocityScale = particleConfig?.velocityScale || 0.01; // 바람 속도 스케일 (px/s)
      const maxIntensity = particleConfig?.maxIntensity || 15; // 최대 강도 (색상 스케일 매핑용)

      particles.forEach(p => {
        if (p.age > MAX_PARTICLE_AGE) {
          Object.assign(p, createParticle()); // 수명 만료 시 입자 재배치
        }

        const [lon, lat] = transform([p.x, p.y], 'CUSTOM', 'EPSG:4326');
        // 1. 입자의 현재 WGS84 위치에서 바람 데이터 보간
        const v = currentGrid.interpolate(lon, lat); // v = [u, v, magnitude]

        if (!v || v[2] === null || v === HOLE_VECTOR) {
          p.age = MAX_PARTICLE_AGE; // 데이터 없는 구역이면 재배치
          return;
        }

        const m = v[2]; // 바람 강도 (magnitude)

        if (m === null) {
          p.age = MAX_PARTICLE_AGE;
        } else {
          const xt = lon + v[0];
          const yt = lat + v[1];
          if (xt && yt) {
            p.xt = xt;
            p.yt = yt;
            buckets[colorStyles.indexFor(m)].push(p);
          } else {
            p.x = xt;
            p.y = yt;
          }
        }

        p.age += 1;
      });
    };

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = PARTICLE_LINE_WIDTH;
    ctx.fillStyle = fadeFillStyle;

    const draw = () => {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(0, 0, viewSize.width, viewSize.height);
      ctx.globalCompositeOperation = prev;

      buckets.forEach((bucket, i) => {
        if (bucket.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = colorStyles[i];
          bucket.forEach(p => {
            const [lon, lat] = transform([p.x, p.y], 'EPSG:4326', 'CUSTOM');
            const [lont, latt] = transform([p.xt, p.yt], 'EPSG:4326', 'CUSTOM');
            ctx.moveTo(lon, lat);
            ctx.lineTo(lont, latt);
            p.x = p.xt;
            p.y = p.yt;
          });
          ctx.stroke();
        }
      });
    };

    const frame = () => {
      try {
        evolve();
        // draw();
        setTimeout(frame, FRAME_RATE_MS);
      } catch (e) {
        console.log(e);
      }
    };

    animationFrameId.current = requestAnimationFrame(frame);
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
      initParticles(); // 이 부분은 성능에 따라 조절
    };
    olMap.on('moveend', handleMoveEnd);
    return () => {
      olMap.un('moveend', handleMoveEnd);
    };
  }, [olMap]);

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
        zIndex: 1000, // 맵 위에 오버레이
      }}
    />
  );
}

export { WindCanvas };
