import { useContext, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { FaAngleDown } from "react-icons/fa";
import { MyContext } from "../../App";
import CityPickerModal from "../CityPickerModal";

const CityDropdown = () => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const {
    cityList,
    selectedCity,
    user,
    updateDeliveryCity,
    setSelectedCity,
  } = useContext(MyContext);

  const selectCity = async (name) => {
    if (user && updateDeliveryCity) {
      await updateDeliveryCity(name);
      return;
    }
    setSelectedCity?.(name);
  };

  return (
    <>
      <button
        type="button"
        className="city-toggle city-toggle-compact"
        onClick={() => setIsOpenModal(true)}
        aria-label={`Delivery city: ${selectedCity || "Select Location"}`}
        title={user ? "Change delivery city and save it to your profile" : "Change delivery city"}
      >
        <span className="city-toggle-icon" aria-hidden="true"><FiMapPin /></span>
        <span className="city-toggle-text">
          <span className="label">Deliver to</span>
          <span className="value">{selectedCity || "Select Location"}</span>
        </span>
        <FaAngleDown className="caret" />
      </button>

      <CityPickerModal
        open={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        cities={cityList}
        value={selectedCity}
        onSelect={selectCity}
        title={user ? "Change your saved city" : "Choose your delivery city"}
        subtitle={user
          ? "This updates your profile and every delivery location across Aura-Mosaic."
          : "Choose a city for browsing. Sign in to save it to your profile."}
      />
    </>
  );
};

export default CityDropdown;
