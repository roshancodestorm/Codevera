type OrbProps = {
  size?: number;
  thinking?: boolean;
  className?: string;
};

export default function Orb({ size = 40, thinking = false, className = '' }: OrbProps) {
  return (
    <span
      aria-hidden="true"
      className={`orb${thinking ? ' orb--thinking' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    />
  );
}
