"use client";

import styled from "@emotion/styled";

export enum IconFilter {
  primary = "primary",
  primaryDark = "primary-dark",
  white = "white",
  whiteFixed = "white-f",
  black = "black",
  blackFixed = "black-f",
  grey = "grey",
  green = "green",
  red = "red",
  unset = "unset",
  yellow = "yellow",
}

interface IconProps {
  url: string;
  fill?: IconFilter;
  opacity?: number;
  size?: number;
  margin?: number;
  alignSelf?: string;
  style?: any;
  className?: string;
  onClick?: () => void;
}

const StyledIcon = styled.div<IconProps & { size: number }>`
  display: block;
  align-self: ${(props) => (props.alignSelf ? props.alignSelf : "center")};
  min-width: ${(props) => props.size}em;
  min-height: ${(props) => props.size}em;
  width: ${(props) => props.size}em;
  height: ${(props) => props.size}em;
  margin: ${(props) =>
    props.margin != null ? props.margin : props.size / 3}em;
  opacity: ${(props) => props.opacity};
  background: ${(props) => `url(${props.url}) no-repeat`};
  background-size: contain;
  background-position: center;
  filter: ${(props) => {
    if (props.fill == IconFilter.primary) return props.theme.filters.primary;
    if (props.fill == IconFilter.primaryDark)
      return props.theme.filters.primaryDark;
    if (props.fill == IconFilter.white) return props.theme.filters.white;
    if (props.fill == IconFilter.whiteFixed)
      return props.theme.fixedColors.white_f;
    if (props.fill == IconFilter.black) return props.theme.filters.black;
    if (props.fill == IconFilter.blackFixed)
      return props.theme.fixedColors.black_f;
    if (props.fill == IconFilter.grey) return props.theme.filters.grey;
    if (props.fill == IconFilter.green) return props.theme.filters.green;
    if (props.fill == IconFilter.red) return props.theme.filters.red;
    if (props.fill == IconFilter.yellow) return props.theme.filters.yellow;
    if (props.fill == IconFilter.unset) return "unset";
  }};
`;

export const MoonIcon = ({
  url,
  fill = IconFilter.primary,
  opacity = 1,
  size = 0.8,
  margin,
  alignSelf,
  style,
  className,
  onClick,
}: IconProps) => {
  return (
    <StyledIcon
      suppressHydrationWarning={true}
      style={style}
      className={className}
      url={url}
      fill={fill}
      opacity={opacity}
      size={size}
      margin={margin}
      alignSelf={alignSelf}
      onClick={onClick}
    ></StyledIcon>
  );
};
