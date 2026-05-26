import { withBasePath } from "../basePath";

export default function ChartLogo() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
      <img
        src={withBasePath("/assets/logos/policyengine-teal.png")}
        alt=""
        style={{
          width: 80,
          opacity: 0.8,
        }}
      />
    </div>
  );
}
