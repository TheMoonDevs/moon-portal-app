"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ReferScrollState, ReferVideoProps } from "../types";
import { ReferVideoStyled } from "./ReferVideo.styles";

export const ReferVideoSection = ({
  play,
  setPlay,
  thumbnail,
  isVideoFinished,
  setScrollState,
  setIsVideoFinished,
  setPlayButtonClicked,
}: ReferVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [isVideoStarted, setIsVideoStarted] = useState(false);

  const clickVideo = () => {
    setPlay((prev: boolean) => !prev);
  };

  useEffect(() => {
    const video = document.querySelector(".video") as HTMLVideoElement;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            video.pause();
            setPlay(false);
            setIsVideoFinished(true);
            setPlayButtonClicked(false);
            return;
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 0% 0px",
        threshold: 0.5,
      }
    );
    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, [setIsVideoFinished, setPlay, setPlayButtonClicked]);

  useEffect(() => {
    if (play) {
      videoRef.current?.play();
      setIsVideoStarted(true);
      setIsVideoPaused(false);
      setIsVideoFinished(false);
    } else {
      if (!videoRef.current?.paused) videoRef.current?.pause();
      setIsVideoPaused(true);
    }
  }, [play, setPlay, setIsVideoFinished]);

  return (
    <ReferVideoStyled
      id={ReferScrollState.VIDEO}
      className={""}
      isVideoPlaying={!isVideoPaused}
      onClick={() => {
        setScrollState(ReferScrollState.VIDEO);
        clickVideo();
        setPlayButtonClicked(true);
      }}
    >
      <div className="video-banner">
        <video
          className="video"
          src={
            "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
            //    "/videos/founder-ref-message.mp4"
          }
          height={1080}
          ref={videoRef}
          onEnded={() => {
            setPlay(false);
            setIsVideoFinished(true);
          }}
        />
      </div>

      {/* {!isVideoStarted && (
        <img className="thumbnail" src={thumbnail} alt="thumbnail" />
      )} */}

      {isVideoPaused && (
        <button
          className="video-play-btn"
          type="button"
          aria-label="Play video."
        />
      )}
    </ReferVideoStyled>
  );
};
