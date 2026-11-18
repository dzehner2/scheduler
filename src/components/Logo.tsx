export default function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <span className={`logo logo-${size}`} aria-label="PlayDate">
      <span className="logo-word">PlayDate</span>
      <span className="logo-stripes" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}
