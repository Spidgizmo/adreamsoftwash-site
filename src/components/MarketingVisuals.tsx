type ClassNameProps = {
  className?: string;
};

export function BubbleField({ className = "" }: ClassNameProps) {
  return (
    <div aria-hidden="true" className={`bubble-field ${className}`}>
      <span className="bubble bubble-a" />
      <span className="bubble bubble-b" />
      <span className="bubble bubble-c" />
      <span className="bubble bubble-d" />
      <span className="bubble bubble-e" />
      <span className="bubble bubble-f" />
    </div>
  );
}

export function WaveDivider({ className = "" }: ClassNameProps) {
  return (
    <div aria-hidden="true" className={`wave-divider ${className}`}>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0,64L60,58.7C120,53,240,43,360,48C480,53,600,75,720,80C840,85,960,75,1080,64C1200,53,1320,43,1380,37.3L1440,32V120H0Z" />
      </svg>
    </div>
  );
}

function CleaningBin({
  kind,
  label,
}: {
  kind: "trash" | "recycling";
  label: string;
}) {
  return (
    <div className={`cleaning-bin cleaning-bin-${kind}`}>
      <div className="cleaning-bin-lid" />
      <div className="cleaning-bin-handle" />
      <div className="cleaning-bin-body">
        <span className="cleaning-bin-shine" />
        <span className="cleaning-bin-label">{label}</span>
      </div>
      <span className="cleaning-bin-wheel cleaning-bin-wheel-left" />
      <span className="cleaning-bin-wheel cleaning-bin-wheel-right" />
    </div>
  );
}

export function BinCleaningHeroGraphic() {
  return (
    <div
      aria-label="Illustration of trash and recycling carts becoming clean"
      className="bin-cleaning-graphic"
      role="img"
    >
      <div aria-hidden="true" className="bin-cleaning-halo" />
      <div aria-hidden="true" className="bin-cleaning-spray" />
      <div className="bin-cleaning-carts">
        <CleaningBin kind="trash" label="TRASH" />
        <CleaningBin kind="recycling" label="RECYCLE" />
      </div>
      <div aria-hidden="true" className="bin-cleaning-bubbles">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="bin-cleaning-caption">
        Collection day ends. The clean routine begins.
      </p>
    </div>
  );
}
