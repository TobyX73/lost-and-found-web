import { LoaderCircle } from 'lucide-react'
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, cx, icon, type ButtonStyle } from './styles'


export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size }, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle {...icon} className="animate-spin" />}
      {children}
    </button>
  )
}

export function LinkButton({ variant, size, className, ...props }: LinkProps & ButtonStyle) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 items-center justify-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-raised hover:text-fg',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const control =
  'rounded-lg border border-line-strong bg-surface text-fg placeholder:text-fg-3 ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-[color-mix(in_srgb,var(--fg)_24%,transparent)] ' +
  'focus:border-accent-ink focus:outline-none focus:ring-3 focus:ring-accent-soft ' +
  'aria-invalid:border-negative disabled:opacity-60'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, 'h-10 w-full px-3 text-[15px]', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, 'min-h-28 w-full px-3 py-2 text-[15px] leading-[22px]', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, 'h-10 w-full appearance-none bg-no-repeat pr-9 pl-3 text-[15px] select-chevron', className)} {...props}>
      {children}
    </select>
  )
}

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Etiqueta, control y ayuda o error, con los ids conectados */
export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium text-fg">
        {label}
        {optional && <span className="text-[13px] font-normal text-fg-3">Opcional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {(error || hint) && (
        <p id={describedBy} className={cx('text-[13px] leading-5', error ? 'text-negative' : 'text-fg-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-fg-3">
      <LoaderCircle {...icon} className="animate-spin" />
      {label}
    </div>
  )
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'error'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-lg border px-3 py-2 text-sm leading-5',
        tone === 'error'
          ? 'border-[color-mix(in_srgb,var(--negative)_30%,transparent)] bg-[color-mix(in_srgb,var(--negative)_6%,transparent)] text-negative'
          : 'border-line bg-raised text-fg-2',
      )}
    >
      {children}
    </div>
  )
}

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex h-9 rounded-lg bg-raised p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex-1 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-[background-color,color] duration-150',
              selected ? 'bg-surface text-fg shadow-sm' : 'text-fg-2 hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
