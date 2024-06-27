"use client";

import { Canvas, extend } from "@react-three/fiber";

import { Effects, Stats } from "@react-three/drei";
import { Stars } from "./Stars";
import { Moon } from "./Moon";
import { Color } from "three";
import { UnrealBloomPass } from "three-stdlib";

extend({ UnrealBloomPass });
export function Backdrop() {
  return (
    <div className="container">
      <main>
        <Canvas
          dpr={1}
          gl={{ alpha: false, stencil: false, antialias: true, depth: false }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
            //backgroundColor: "black",
          }}
          camera={{ position: [0, 0, 20], fov: 45 }}
        >
          {/* <Stats /> */}

          <directionalLight
            position={[1200, 2000, 300]}
            color={new Color("#fffaef")}
            castShadow
            intensity={1.5}
          />
          {/* <Moon />
          <Stars /> */}
          {/* <SkyBox /> */}
          {/* <UnrealBloomPass strength={0.18} radius={0.5} threshold={1} /> */}
        </Canvas>
      </main>
    </div>
  );
}
