import Button from "@mui/material/Button";
import { FaMinus } from "react-icons/fa6";
import { IoMdAdd } from "react-icons/io";

const QuantityBox = ({ value = 1, onChange, min = 1, max = 99 }) => {
  const clamp = (next) => Math.max(min, Math.min(max, Math.floor(Number(next) || min)));
  const setValue = (next) => onChange?.(clamp(next));

  return (
    <div className="quantityDrop d-flex align-items-center">
      <Button onClick={() => setValue(value - 1)} disabled={value <= min}><FaMinus /></Button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Quantity"
      />
      <Button onClick={() => setValue(value + 1)} disabled={value >= max}><IoMdAdd /></Button>
    </div>
  );
};

export default QuantityBox;
