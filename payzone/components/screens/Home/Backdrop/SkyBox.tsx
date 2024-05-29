import { useTexture } from "@react-three/drei";
import { BackSide } from "three";

export function SkyBox() {
  //   const texture = useTexture("/digital_painting_golden_hour_sunset.jpg");

  return (
    <mesh userData={{ lensflare: "no-occlusion" }} scale={[-50, 50, 50]}>
      <sphereGeometry args={[50, 60, 40]} />
      <meshBasicMaterial toneMapped={false} color={0x000000} side={BackSide} />
    </mesh>
  );
}
