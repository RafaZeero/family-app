interface UnderConstructionProps {
  title: string
}

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-dara-alt">
        <i className="fas fa-screwdriver-wrench text-2xl text-dara-light" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold text-dara-blue">{title}</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-dara-light">
          Em Construção
        </p>
      </div>
      <p className="text-sm text-dara-strong/50 max-w-xs">
        Esta seção está sendo desenvolvida. Em breve estará disponível.
      </p>
    </div>
  )
}
