"use client";

import { LensFlare } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Color, Vector3 } from "three";
export const LensFlareSun = () => {
  // const lensFlareProps = useControls({
  //   LensFlare: folder(
  //     {
  //       // enabled: { value: false, label: "enabled?" },
  //       // opacity: { value: 1.0, min: 0.0, max: 1.0, label: "opacity" },
  //       // position: {
  //       //   value: { x: -25, y: 6, z: -60 },

  //       //   step: 1,
  //       //   label: "position",
  //       // },
  //       // glareSize: { value: 0.08, min: 0.01, max: 1.0, label: "glareSize" },
  //       // starPoints: {
  //       //   value: 6.0,
  //       //   step: 1.0,
  //       //   min: 0,
  //       //   max: 32.0,
  //       //   label: "starPoints",
  //       // },
  //       // animated: { value: true, label: "animated?" },
  //       // followMouse: { value: false, label: "followMouse?" },
  //       // anamorphic: { value: false, label: "anamorphic?" },
  //       // colorGain: { value: new Color(56, 22, 11), label: 'colorGain' },

  //       Flare: folder({
  //         flareSpeed: {
  //           value: 0.1,
  //           step: 0.001,
  //           min: 0.0,
  //           max: 1.0,
  //           label: "flareSpeed",
  //         },
  //         flareShape: {
  //           value: 0.1,
  //           step: 0.001,
  //           min: 0.0,
  //           max: 1.0,
  //           label: "flareShape",
  //         },
  //         flareSize: {
  //           value: 0.5,
  //           step: 0.001,
  //           min: 0.0,
  //           max: 0.01,
  //           label: "flareSize",
  //         },
  //       }),

  //       SecondaryGhosts: folder({
  //         secondaryGhosts: { value: true, label: "secondaryGhosts?" },
  //         ghostScale: { value: 0.1, min: 0.01, max: 1.0, label: "ghostScale" },
  //         aditionalStreaks: { value: true, label: "aditionalStreaks?" },
  //       }),

  //       StartBurst: folder({
  //         starBurst: { value: true, label: "starBurst?" },
  //         haloScale: { value: 0.5, step: 0.01, min: 0.3, max: 1.0 },
  //       }),
  //     },
  //     { collapsed: true }
  //   ),
  // });

  return (
    <LensFlare
      colorGain={new Color(0xffffff)}
      blendFunction={BlendFunction.MULTIPLY}
      position={new Vector3(-14, 20.9, -5)}
      enabled={true}
      opacity={1}
      glareSize={0.08}
      starPoints={6.0}
      animated={true}
      followMouse={false}
      anamorphic={false}
      flareSpeed={0.1}
      flareShape={0.1}
      flareSize={0.5}
      secondaryGhosts={true}
      ghostScale={0.1}
      aditionalStreaks={true}
      starBurst={true}
      haloScale={0.5}

      // {...lensFlareProps}
    />
  );
};
