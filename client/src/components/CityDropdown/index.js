import React, { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Slide from "@mui/material/Slide";
import { FiSearch } from "react-icons/fi";
import { IoCloseSharp } from "react-icons/io5";
import { FaAngleDown } from "react-icons/fa";
import { MyContext } from "../../App";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CityDropdown = () => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [visibleCities, setVisibleCities] = useState([]);
  const context = useContext(MyContext);

  useEffect(() => {
    setVisibleCities(context.cityList || []);
  }, [context.cityList]);

  const selectCity = (name) => {
    context.setSelectedCity(name);
    setIsOpenModal(false);
  };

  const filterList = (event) => {
    const keyword = event.target.value.trim().toLowerCase();
    if (!keyword) {
      setVisibleCities(context.cityList || []);
      return;
    }
    setVisibleCities(
      (context.cityList || []).filter((item) => item.name.toLowerCase().includes(keyword))
    );
  };

  return (
    <>
      <button
        type="button"
        className="city-toggle"
        onClick={() => setIsOpenModal(true)}
        aria-label="Choose delivery city"
      >
        <span className="label">Your Location</span>
        <span className="value">{context.selectedCity || "Select Location"}</span>
        <FaAngleDown className="caret" />
      </button>

      <Dialog
        open={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        className="locationModal"
        slots={{ transition: Transition }}
      >
        <h4 className="mb-0">Choose your delivery city</h4>
        <p>Select the district/city used for checkout.</p>
        <Button className="close_" onClick={() => setIsOpenModal(false)} aria-label="Close location picker">
          <IoCloseSharp />
        </Button>

        <div className="headersearch w-100">
          <input type="search" placeholder="Search locations" onChange={filterList} aria-label="Search delivery locations" />
          <Button aria-label="Search locations">
            <FiSearch />
          </Button>
        </div>

        <ul className="cityList mt-3">
          {visibleCities.length === 0 ? (
            <li className="text-muted px-3 py-2">No matching locations.</li>
          ) : (
            visibleCities.map((item) => (
              <li key={item.name}>
                <Button
                  onClick={() => selectCity(item.name)}
                  className={context.selectedCity === item.name ? "active" : ""}
                >
                  {item.name}
                </Button>
              </li>
            ))
          )}
        </ul>
      </Dialog>
    </>
  );
};

export default CityDropdown;
