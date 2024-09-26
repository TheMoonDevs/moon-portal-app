"use client";
import styled from "@emotion/styled";
import media from "@/styles/media";

export const ReferVideoStyled = styled.div<{
  isVideoPlaying: boolean;
}>`
  position: relative;
  display: block;
  height: 100vh;
  cursor: ${(props) => props.isVideoPlaying && "pointer"};

  & .video-banner {
    position: absolute;
    margin: auto;
    width: 100%;
    height: 100%;

    background: #fff;

    overflow: hidden;
    clip-path: 0 0;
    transform: translatez(0);
  }

  & .video {
    transform: translatez(0);
    position: absolute;
    top: -100%;
    bottom: -100%;
    left: -100%;
    right: -100%;

    margin: auto;
    min-width: 100%;
    min-height: 100vh;
    object-fit: cover;
  }

  & .thumbnail {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  & .video-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    overflow: hidden;

    ${media.largeMobile} {
      width: 70px;
      height: 70px;
    }

    &::before,
    &::after {
      content: "";
      position: absolute;
    }

    &::before {
      left: 0;
      top: 0;
      width: inherit;
      height: inherit;
      background: radial-gradient(
        100% 100% at 0% 0%,
        rgba(0, 0, 0, 0.2) 0%,
        rgba(0, 0, 0, 0.05) 100%
      );
      border-radius: 50%;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    &::after {
      width: 30px;
      height: 28px;
      background: url("/icons/play-icon.svg") right no-repeat;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
`;
