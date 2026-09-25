import React, { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Slide from "@mui/material/Slide";
import { FiCheck, FiMapPin, FiSearch } from "react-icons/fi";
import { IoCloseSharp } from "react-icons/io5";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CityPickerModal = ({
  open,
  onClose,
  cities = [],
  value = "",
  onSelect,
  title = "Choose your delivery city",
  subtitle = "This city will be used for delivery and checkout.",
  profileMode = false,
}) => {
  const [query, setQuery] = useState("");
  const [savingCity, setSavingCity] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setSavingCity("");
      setError("");
    }
  }, [open]);

  const visibleCities = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return cities || [];
    return (cities || []).filter((item) => String(item?.name || "").toLowerCase().includes(keyword));
  }, [cities, query]);

  const chooseCity = async (name) => {
    if (!name || savingCity) return;
    setSavingCity(name);
    setError("");
    try {
      await Promise.resolve(onSelect?.(name));
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save this city. Please try again.");
    } finally {
      setSavingCity("");
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => !savingCity && onClose?.()}
      className={`locationModal cityPickerModal ${profileMode ? "profileCityPickerModal" : ""}`}
      slots={{ transition: Transition }}
    >
      <Button className="close_" onClick={() => onClose?.()} aria-label="Close city picker" disabled={Boolean(savingCity)}>
        <IoCloseSharp />
      </Button>

      <div className="locationModal__hero">
        <div className="locationModal__badge" aria-hidden="true"><FiMapPin /></div>
        <div className="locationModal__copy">
          <span className="cityPickerModal__eyebrow">{profileMode ? "Profile delivery city" : "Delivery location"}</span>
          <h4 className="mb-0">{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="headersearch locationSearch w-100">
        <FiSearch className="cityPickerModal__searchIcon" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search district or city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search delivery locations"
          autoFocus={profileMode}
        />
      </div>

      <div className="locationModal__meta">
        <span className="locationCount">{visibleCities.length} locations</span>
        <span className="selectedCityPill">
          {profileMode ? "Saved city" : "Delivering to"} <strong>{value || "Not selected"}</strong>
        </span>
      </div>

      {error && <div className="cityPickerModal__error">{error}</div>}

      <ul className="cityList mt-3">
        {visibleCities.length === 0 ? (
          <li className="cityList__empty">No matching locations found.</li>
        ) : (
          visibleCities.map((item) => {
            const cityName = item?.name || "";
            const active = value === cityName;
            const saving = savingCity === cityName;
            return (
              <li key={cityName}>
                <Button
                  onClick={() => chooseCity(cityName)}
                  className={active ? "active" : ""}
                  disabled={Boolean(savingCity)}
                >
                  <span className="cityList__pin" aria-hidden="true"><FiMapPin /></span>
                  <span className="cityList__name">{cityName}</span>
                  <span className={`cityList__check ${saving ? "saving" : ""}`} aria-hidden="true">
                    {saving ? <span className="cityPickerModal__spinner" /> : <FiCheck />}
                  </span>
                </Button>
              </li>
            );
          })
        )}
      </ul>

      {profileMode && (
        <div className="cityPickerModal__footnote">
          Your selected city is saved to your Aura-Mosaic profile and used automatically at checkout.
        </div>
      )}
    </Dialog>
  );
};

export default CityPickerModal;
