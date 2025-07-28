import React, { useRef, useEffect, useContext } from 'react';
import _ from 'lodash';

import { µ } from '@/earth/1.0.0/micro'; // micro.js에서 µ를 import
import MapContext from '@/components/map/MapContext';

// 원래 earth.js에서 가져온 상수들 (적절히 조절 가능)
const MAX_PARTICLE_AGE = 100; // 입자 수명 프레임 수
const PARTICLE_LINE_WIDTH = 1.0; // 입자 선 굵기
const PARTICLE_MULTIPLIER = 7; // 화면 면적당 입자 수 조절 (예: 7/3은 너무 많을 수 있음, 1/10000은 픽셀당 입자 수)
const FRAME_RATE_MS = 40; // milliseconds per frame (약 25fps)
const INTENSITY_SCALE_STEP = 10; // step size of particle intensity color scale

function WindCanvas({ currentGrid, currentField, bounds }) {
  const map = useContext(MapContext);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!currentField || !currentGrid || !bounds) return;

    animate(currentField, currentGrid, bounds);
  }, [map]);

  const animate = (field, grids, bounds) => {
    const colorStyles = µ.windIntensityColorScale(
      INTENSITY_SCALE_STEP,
      grids.particles.maxIntensity
    );
    const buckets = colorStyles.map(() => {
      return [];
    });
    const particleCount = Math.round(bounds.width * PARTICLE_MULTIPLIER);
    const fadeFillStyle = 'rgba(0, 0, 0, 0.97)';
    console.log('particleCount: ' + particleCount);

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(field.randomize({ age: _.random(0, MAX_PARTICLE_AGE) }));
    }
    console.log(particles);

    const evolve = () => {
      buckets.forEach(bucket => {
        bucket.length = 0;
      });

      particles.forEach(particle => {
        if (particle.age > MAX_PARTICLE_AGE) {
          field.randomize(particle).age = 0;
        }

        const x = particle.x;
        const y = particle.y;
        const v = field(x, y);
        const m = v[2];
        if (m === null) {
          particle.age = MAX_PARTICLE_AGE;
        } else {
          const xt = x + v[0];
          const yt = y + v[1];
          if (field.isDefined(xt, yt)) {
            particle.xt = xt;
            particle.yt = yt;
            buckets[colorStyles.indexFor(m)].push(particle);
          } else {
            particle.xt = xt;
            particle.yt = yt;
          }
        }
        particle.age += 1;
      });
    };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = PARTICLE_LINE_WIDTH;
    ctx.fillStyle = fadeFillStyle;

    const draw = () => {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.globalCompositeOperation = prev;

      buckets.forEach((bucket, i) => {
        if (bucket.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = colorStyles[i];
          bucket.forEach(particle => {
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.xt, particle.yt);
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          ctx.stroke();
        }
      });
    };

    (function frame() {
      try {
        evolve();
        draw();
        setTimeout(frame, FRAME_RATE_MS);
      } catch (e) {
        console.log('Error drawing animation: ' + e);
      }
    })();
  };

  return (
    <canvas
      ref={canvasRef}
      width={bounds.width}
      height={bounds.height}
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
