import { useCallback, useEffect, useRef } from 'react';
import { µ } from '@/earth/1.0.0/micro.js'; // micro.js에서 내보낸 객체
import _ from 'lodash';

const MAX_PARTICLE_AGE = 150;
const PARTICLE_LINE_WIDTH = 1.0;
const PARTICLE_MULTIPLIER = 7;
const PARTICLE_REDUCTION = 0.75;
const FRAME_RATE = 40; // milliseconds per frame
const HOLE_VECTOR = [NaN, NaN, null]; // products.js와 earth.js에서 사용됨

const Animation = ({ currentGrid, globeProjection, view }) => {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particlesRef = useRef([]);
  const frameCount = useRef(0);

  // 현재 활성화된 제품의 입자 설정을 가져옵니다.
  // 이 부분은 `products.js`에서 `particles` 속성을 가져오는 로직과 유사해야 합니다.
  // 여기서는 `currentGrid`에서 `particles` 정보를 직접 받는다고 가정합니다.
  const particleConfig = currentGrid?.particles;
  const colorScale = currentGrid?.scale?.gradient || µ.windIntensityColorScale; // 기본값 제공

  const createParticle = useCallback(() => {
    const λ = _.random(0, 360); // 경도
    const φ = _.random(-90, 90); // 위도
    return {
      λ,
      φ,
      age: _.random(0, MAX_PARTICLE_AGE), // 초기 수명 무작위 설정
      x: NaN, // 화면 X 좌표
      y: NaN, // 화면 Y 좌표
      vx: NaN, // 속도 X
      vy: NaN, // 속도 Y
      intensity: NaN, // 강도 (색상에 사용)
    };
  }, []);

  const initParticles = useCallback(() => {
    const particleCount = Math.round(
      ((view.width * view.height) / (µ.isMobile() ? PARTICLE_REDUCTION : 1)) *
        PARTICLE_MULTIPLIER
    );
    particlesRef.current = _.range(particleCount).map(createParticle);
  }, [createParticle, view]);

  useEffect(() => {
    initParticles(); // 컴포넌트 마운트 시 또는 뷰/그리드 변경 시 입자 초기화
  }, [initParticles, currentGrid, view]); // currentGrid 또는 view가 변경될 때 재실행

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    canvas.width = view.width * dpr;
    canvas.height = view.height * dpr;
    ctx.scale(dpr, dpr);

    µ.clearCanvas(canvas);

    if (!currentGrid || !globeProjection) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }

    const particles = particlesRef.current;
    const bounds = currentGrid.bounds; // 그리드의 유효한 경계
    const colorStyles = particleConfig?.intensityColorScale || colorScale; // 정의된 색상 스케일 사용

    particles.forEach(p => {
      // 입자 이동 및 수명 업데이트
      let x = p.x,
        y = p.y;
      let v = null; // 벡터 데이터 [u, v, magnitude]

      if (p.age > MAX_PARTICLE_AGE) {
        // 수명 만료 시 입자 재배치
        Object.assign(p, createParticle());
      }

      if (isNaN(x)) {
        // 입자가 아직 렌더링되지 않았거나 화면 밖으로 나간 경우, 새 위치에서 시작
        const randomCoord = [_.random(-180, 180), _.random(-90, 90)]; // 무작위 경도, 위도
        const projected = globeProjection(randomCoord); // 투영된 픽셀 좌표
        x = projected[0];
        y = projected[1];
        p.λ = randomCoord[0];
        p.φ = randomCoord[1];
        p.age = 0; // 수명 초기화
      }

      // 현재 위치에서 데이터 보간
      v = currentGrid.interpolate(p.λ, p.φ);

      if (v === null || v[2] === null || v === HOLE_VECTOR) {
        // 데이터가 없는 구역이면 입자 재배치
        p.age = MAX_PARTICLE_AGE; // 다음 프레임에서 재배치되도록 설정
        return;
      }

      const velocityScale = particleConfig?.velocityScale || 1;
      const vx = v[0] * velocityScale;
      const vy = v[1] * velocityScale;
      const intensity = v[2]; // magnitude

      // 입자 위치 업데이트 (간단한 오일러 적분)
      // 여기서 dt는 FRAME_RATE에 기반한 시간 간격이 될 수 있습니다.
      // 원래 코드에서는 픽셀 기반 이동이었습니다. 투영에 따라 달라집니다.
      // D3 투영의 역변환을 사용하여 경도/위도 업데이트
      const currentScreenPos = [x + vx, y + vy];
      const newGeoCoord = globeProjection.invert(currentScreenPos);

      if (
        newGeoCoord &&
        newGeoCoord[0] !== null &&
        newGeoCoord[1] !== null &&
        _.isFinite(newGeoCoord[0]) &&
        _.isFinite(newGeoCoord[1])
      ) {
        p.λ = newGeoCoord[0];
        p.φ = newGeoCoord[1];
        // 새로운 지리적 좌표를 다시 화면 좌표로 변환
        const newProjected = globeProjection(newGeoCoord);
        p.x = newProjected[0];
        p.y = newProjected[1];
        p.vx = vx;
        p.vy = vy;
        p.intensity = intensity;
        p.age++;
      } else {
        // 화면 밖으로 나간 경우 재배치
        p.age = MAX_PARTICLE_AGE;
      }
    });

    // 입자 그리기
    particles.forEach(p => {
      if (!isNaN(p.x) && !isNaN(p.y) && p.intensity !== null) {
        ctx.beginPath();
        ctx.lineWidth = PARTICLE_LINE_WIDTH;
        const color = colorStyles(p.intensity, OVERLAY_ALPHA); // µ.windIntensityColorScale 사용
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${
          color[3] / 255
        })`;
        ctx.moveTo(p.x, p.y);
        // 이전 위치가 있다면 선으로 그리기 (원래 코드 방식)
        const prevX = p.x - p.vx; // 단순화된 이전 위치 추정
        const prevY = p.y - p.vy;
        ctx.lineTo(prevX, prevY);
        ctx.stroke();
      }
    });

    // 다음 프레임 요청
    animationFrameId.current = requestAnimationFrame(animate);
  }, [
    currentGrid,
    globeProjection,
    view,
    createParticle,
    particleConfig,
    colorScale,
  ]);

  useEffect(() => {
    // 애니메이션 시작 및 정리
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [animate]);
  return <canvas ref={canvasRef} className="globe-overlay" />;
};

export { Animation };
