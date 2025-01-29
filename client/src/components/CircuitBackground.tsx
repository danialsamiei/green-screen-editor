export default function CircuitBackground() {
  return (
    <div className="fixed inset-0 z-0 opacity-10">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <pattern id="circuit" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <path
            d="M10 10h30M25 10v30M10 25h30M10 40h30"
            stroke="currentColor"
            strokeWidth="0.5"
            fill="none"
          />
          <circle cx="10" cy="10" r="2" className="fill-primary" />
          <circle cx="25" cy="25" r="2" className="fill-primary" />
          <circle cx="40" cy="40" r="2" className="fill-primary" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
  );
}
