"use client";

import useMousePosition from "@/utils/hooks/useMousePosition";
import { useFrame, useLoader } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FrontSide } from "three/src/constants.js";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";
import { Color } from "three/src/math/Color.js";
import { Mesh } from "three/src/objects/Mesh.js";

export const Moon = () => {
  const moonRef = useRef<Mesh>(null);
  const texture = useLoader(TextureLoader, "/moon-texture.jpg");
  const displacement = useLoader(TextureLoader, "/moon-displacement-map.jpg");
  const mousePosition = useMousePosition();
  const moonGsapRef = useRef<any>(null);

  useEffect(() => {
    if (moonGsapRef.current) {
      gsap.to(moonGsapRef.current.position, {
        x: mousePosition.xfromcenter / 2000,
        y: -1 - mousePosition.yfromcenter / 2000,
        duration: 2.5,
        ease: "back.out(1.7)",
      });
    }
  }, [mousePosition]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    if (moonRef.current) {
      moonRef.current.rotation.y = elapsedTime * 0.05;
    }
  });

  return (
    <group
      scale={2}
      position={[0, -1, 0]}
      ref={moonGsapRef}
      rotation={[Math.PI / 2, -Math.PI / 2, Math.PI / 2]}
      receiveShadow
    >
      <mesh ref={moonRef} receiveShadow>
        <sphereGeometry args={[4, 64, 64]} />
        <meshStandardMaterial
          color={new Color(0xffffff)}
          map={texture}
          bumpScale={0.8}
          bumpMap={displacement}
          displacementScale={0.08}
          side={FrontSide}
          displacementMap={displacement}
        />
      </mesh>
    </group>
  );
};
