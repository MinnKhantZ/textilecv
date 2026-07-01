interface BrandMarkProps {
  sizeClassName?: string
  imageClassName?: string
  frameClassName?: string
}

export default function BrandMark({
  sizeClassName = 'h-11 w-11',
  imageClassName = 'h-10 w-10 rounded-2xl',
  frameClassName = 'rounded-[1.35rem] border border-white/15 bg-white/10 p-1 shadow-[0_24px_60px_rgba(11,20,55,0.28)] backdrop-blur',
}: BrandMarkProps) {
  return (
    <div className={`${sizeClassName} ${frameClassName} flex items-center justify-center`}>
      <img src="/icon.png" alt="TextileCV logo" className={`${imageClassName} object-cover`} />
    </div>
  )
}
