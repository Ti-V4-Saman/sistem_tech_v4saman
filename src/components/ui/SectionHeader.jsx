/**
 * @module SectionHeader
 * @description Cabeçalho padronizado para seções internas.
 */
export function SectionHeader({ eyebrow, title, description, right }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <div className="section-header__eyebrow">{eyebrow}</div>}
        <div className="section-header__title">{title}</div>
        {description && <p className="section-header__description">{description}</p>}
      </div>
      {right && <div className="section-header__right">{right}</div>}
    </div>
  );
}

export default SectionHeader;
