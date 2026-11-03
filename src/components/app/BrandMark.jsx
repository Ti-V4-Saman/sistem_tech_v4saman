export function BrandMark({ compact = false, className = "" }) {
  return (
    <img
      className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${className}`.trim()}
      src="/v4-logo.png"
      alt="V4 Company"
    />
  );
}

export default BrandMark;
