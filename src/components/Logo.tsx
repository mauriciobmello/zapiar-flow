interface LogoProps {
  className?: string
  showText?: boolean
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <span className={`text-xl font-bold tracking-tight ${className}`}>
      <span className="text-primary-600">Zapiar</span>
      <span className="text-gray-700 font-medium ml-1">Flow</span>
    </span>
  )
}
