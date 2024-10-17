import React, { useEffect, useState } from 'react';
import { FilterCardStyled } from './FilterCard.styles';
import { Link } from "react-transition-progress/next";
import { APP_ROUTES } from "@/utils/constants/AppInfo";

const FilterCard = ({
  toggleTextVisibility,
  isTextVisible,
  departmentJobsCounts,
  activeDepartment,
  setActiveDepartment,
  isDateSwitchSelected,
  setIsDateSwitchSelected,
}: {
  toggleTextVisibility: () => void;
  isTextVisible: boolean;
  departmentJobsCounts: { [key: string]: number };
  activeDepartment: string | null;
  setActiveDepartment: (department: string | null) => void;
  isDateSwitchSelected: boolean;
  setIsDateSwitchSelected: (value: boolean) => void;
}) => {
  const switchButton = (value: boolean) => {
    setIsDateSwitchSelected(value);
  };

  return (
    <FilterCardStyled>
      {Object.entries(departmentJobsCounts).map(([department, count]) => {
        return (
          <button
            className={`department_btn ${department === activeDepartment ? "active" : ""}`}
            key={`department-${department}-${count}`}
            onClick={() =>
              setActiveDepartment(
                department === activeDepartment ? null : department
              )
            }
          >
            <span>{department}</span>
            <span>{count}</span>
          </button>
        );
      })}
      <div className="filter_container">
        <div className="filter_box">
          <div className="switch_button">
            <button
              className={`switch-button-case left ${isDateSwitchSelected ? "active-case" : ""}`}
              onClick={() => switchButton(true)}
            >
              <span className="material-symbols-outlined ms-thick">
                calendar_today
              </span>
            </button>
            <button
              className={`switch-button-case right ${isDateSwitchSelected ? "" : "active-case"}`}
              onClick={() => switchButton(false)}
            >
              <span className="material-symbols-outlined ms-thick">
                shuffle
              </span>
            </button>
          </div>
          <button
            className={`text_show_hide_button ${isTextVisible ? "active" : ""}`}
            onClick={toggleTextVisibility}
          >
            Aa
          </button>
          <Link href={APP_ROUTES.workLife} className="back_btn">
            <button>Back</button>
          </Link>
        </div>
      </div>
    </FilterCardStyled>
  );
};

export default FilterCard;
