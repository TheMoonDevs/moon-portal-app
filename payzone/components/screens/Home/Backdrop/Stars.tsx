import useMousePosition from "@/utils/hooks/useMousePosition";
import { useLoader } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { TextureLoader } from "three";
import { Color } from "three/src/math/Color.js";
import { Vector3 } from "three/src/math/Vector3.js";
// import { Shape, ExtrudeGeometry } from "three";

interface Star {
  position: [number, number, number];
  speed: number;
  scale: number;
}

export const Stars = () => {
  const mousePosition = useMousePosition();
  const starsGsapRef = useRef<any>(null);
  const starTexture = useLoader(TextureLoader, "/star-texture.png");
  const [stars, setStars] = useState<Star[]>(
    Array.from({ length: 500 }, (_, index) => ({
      position: [
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        -Math.random() * 10,
      ],
      speed: 0.001 + Math.random() * 0.02,
      scale: 0.2,
    }))
  );

  // const createStarShape = () => {
  //   const shape = new Shape();
  //   const outerRadius = 0.1;
  //   const innerRadius = 0.05;
  //   const numPoints = 5;

  //   for (let i = 0; i < numPoints * 2; i++) {
  //     const angle = (i / (numPoints * 2)) * Math.PI * 2;
  //     const radius = i % 2 === 0 ? outerRadius : innerRadius;
  //     const x = Math.cos(angle) * radius;
  //     const y = Math.sin(angle) * radius;

  //     if (i === 0) {
  //       shape.moveTo(x, y);
  //     } else {
  //       shape.lineTo(x, y);
  //     }
  //   }
  //   shape.closePath();
  //   return shape;
  // };

  // const starGeometry = new ExtrudeGeometry(createStarShape(), {
  //   depth: 0.02,
  //   bevelEnabled: false,
  // });

  useEffect(() => {
    const updateStars = () => {
      setStars((prevStars) =>
        prevStars.map((star, index) => ({
          ...star,
          position: [
            star.position[0],
            star.position[1] >= 25 ? -25 : star.position[1] + star.speed,
            star.position[2],
          ],
          scale: 0.1 * Math.abs(Math.sin(Date.now() * 0.001 + index)) + 0.2,
        }))
      );
    };

    const interval = setInterval(() => {
      updateStars();
    }, 1000 / 60);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (starsGsapRef.current) {
      gsap.to(starsGsapRef.current.rotation, {
        x: mousePosition.yfromcenter / 5000,
        y: mousePosition.xfromcenter / 5000,
        duration: 0.5,
        ease: "power4",
      });
    }
  }, [mousePosition]);

  return (
    <group ref={starsGsapRef}>
      {stars.map((star, index) => {
        return (
          <mesh
            key={index}
            position={new Vector3(...star.position)}
            scale={new Vector3(star.scale, star.scale, star.scale)}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial
              map={starTexture}
              color={new Color(255, 255, 255)}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};
