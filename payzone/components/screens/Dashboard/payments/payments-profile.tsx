import React from "react";

const PaymentsProfile = () => {
  return (
    <div className="flex flex-col gap-5 h-[50%] p-2 bg-whiteSmoke">
      <div className="flex justify-between mt-4 items-center px-2">
        <button className="font-black w-fit py-2 px-3 text-whiteSmoke bg-black">
          Growth Ladder
        </button>
        <span className="font-thin">Frontend Developer</span>
      </div>
      <p className="text-sm text-midGrey px-2">
        Track where you are, how much you’ve grown, and how much you can grow.
      </p>
      <div>
        <div className="flex justify-between p-2 border border-midGrey">
          <span className="font-bold">Apprentice</span>
          <span className="font-bold">10,000 INR</span>
        </div>
        <div className="flex justify-between p-2 text-midGrey">
          <span className="font-thin">JourneyMan</span>
          <span className="font-bold">~ 25k -50k INR</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentsProfile;
