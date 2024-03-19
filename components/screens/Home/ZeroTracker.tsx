import React, { useState } from "react";
import Slider from "react-slick";

export const ZeroTracker: React.FC = () => {
  const [activeSlide2, setActiveSlide2] = useState(0);
  const settings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    afterChange: (current: number) => setActiveSlide2(current),
  };

  return (
    <div className=" flex flex-col py-1 px-1 mx-2 my-1 gap-3 bg-white rounded-[1.15em]">
      <Slider {...settings}>
        <div>
          <h3>1</h3>
        </div>
        <div>
          <h3>2</h3>
        </div>
        <div>
          <h3>3</h3>
        </div>
      </Slider>
    </div>
  );
};
