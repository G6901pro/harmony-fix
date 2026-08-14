import { BD_DIVISIONS, districtsFor, upazilasFor } from "@/lib/bd-locations";
import { SearchSelect } from "@/components/shop/SearchSelect";

export type BdLocation = {
  division: string;
  district: string;
  area: string;
};

export type BdLocationErrors = Partial<Record<keyof BdLocation, string>>;

export const emptyLocation: BdLocation = { division: "", district: "", area: "" };

/**
 * Reusable 3-level Bangladesh address selector (Division → District → Area/Upazila/Thana).
 * Renders three fields as a fragment so it inherits the parent grid layout.
 */
export function LocationSelect({
  value,
  onChange,
  errors,
  required = true,
  renderField,
}: {
  value: BdLocation;
  onChange: (next: BdLocation) => void;
  errors?: BdLocationErrors;
  required?: boolean;
  /** Wraps each select so the host page can add its own label / error markup. */
  renderField: (
    key: keyof BdLocation,
    node: React.ReactNode,
    error?: string,
  ) => React.ReactNode;
}) {
  const star = required ? " *" : "";

  return (
    <>
      {renderField(
        "division",
        <SearchSelect
          label="Division"
          placeholder={`Select division${star}`}
          value={value.division}
          invalid={Boolean(errors?.division)}
          options={BD_DIVISIONS}
          onChange={(division) => onChange({ division, district: "", area: "" })}
        />,
        errors?.division,
      )}
      {renderField(
        "district",
        <SearchSelect
          label="District"
          placeholder={value.division ? `Select district${star}` : "Select a division first"}
          value={value.district}
          disabled={!value.division}
          invalid={Boolean(errors?.district)}
          options={districtsFor(value.division)}
          onChange={(district) => onChange({ ...value, district, area: "" })}
        />,
        errors?.district,
      )}
      {renderField(
        "area",
        <SearchSelect
          label="Area / Upazila / Thana"
          placeholder={
            value.district ? `Select area / upazila${star}` : "Select a district first"
          }
          value={value.area}
          disabled={!value.district}
          invalid={Boolean(errors?.area)}
          options={upazilasFor(value.district)}
          onChange={(area) => onChange({ ...value, area })}
        />,
        errors?.area,
      )}
    </>
  );
}
