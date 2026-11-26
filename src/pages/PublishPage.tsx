import { LocateFixed, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { PageContainer } from '../components/layout'
import { PickerMap } from '../components/map'
import { ZoneGlyph } from '../components/post-bits'
import { cx, icon } from '../components/styles'
import { Button, Field, IconButton, Input, Notice, Select, Textarea } from '../components/ui'
import { CATEGORIES } from '../features/posts/categories'
import { useCreatePost } from '../features/posts/hooks'
import type { CategorySlug, PostType } from '../features/posts/types'
import { useAuth } from '../lib/auth'
import { formatDistance } from '../lib/format'
import { publicZoneRadius, type LatLng } from '../lib/geo'

interface Question {
  key: number
  question: string
  expectedAnswer: string
}

type Errors = Partial<Record<'title' | 'category' | 'occurredAt' | 'location' | 'questions', string>>

/** Valor para <input type="datetime-local"> en la hora local */
function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const TYPE_OPTIONS: { value: PostType; title: string; hint: string }[] = [
  { value: 'LOST', title: 'Perdí algo', hint: 'Lo publicás y te avisamos si alguien lo encuentra' },
  { value: 'FOUND', title: 'Encontré algo', hint: 'Dejás preguntas para confirmar quién es el dueño' },
]

export function PublishPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const create = useCreatePost()

  const [type, setType] = useState<PostType>(params.get('tipo') === 'FOUND' ? 'FOUND' : 'LOST')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CategorySlug | ''>(
    (CATEGORIES.find((c) => c.slug === params.get('categoria'))?.slug ?? '') as CategorySlug | '',
  )
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [brand, setBrand] = useState('')
  const [openedAt] = useState(() => toLocalInput(new Date()))
  const [occurredAt, setOccurredAt] = useState(openedAt)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [radiusM, setRadiusM] = useState(300)
  const [questions, setQuestions] = useState<Question[]>([{ key: 1, question: '', expectedAnswer: '' }])
  const [errors, setErrors] = useState<Errors>({})
  const [locating, setLocating] = useState(false)

  const locateMe = () => {
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10_000 },
    )
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (title.trim().length < 3) next.title = 'Escribí al menos 3 letras, por ejemplo "Billetera marrón"'
    if (!category) next.category = 'Elegí una categoría'
    if (!occurredAt || new Date(occurredAt) > new Date()) next.occurredAt = 'La fecha no puede ser futura'
    if (!location) next.location = 'Tocá el mapa para marcar la zona'
    if (type === 'FOUND') {
      const complete = questions.filter((q) => q.question.trim() && q.expectedAnswer.trim())
      if (complete.length === 0) next.questions = 'Agregá al menos una pregunta con su respuesta'
      else if (complete.length !== questions.length) next.questions = 'Completá o borrá las preguntas vacías'
    }
    return next
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0 || !user || !location || !category) return

    create.mutate(
      {
        author: user,
        input: {
          type,
          title,
          description,
          category,
          attributes: { color, marca: brand },
          occurredAt: new Date(occurredAt).toISOString(),
          location,
          radiusM,
          verificationQuestions: type === 'FOUND' ? questions : undefined,
        },
      },
      { onSuccess: (post) => navigate(`/objetos/${post.id}`, { replace: true }) },
    )
  }

  const updateQuestion = (key: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))

  return (
    <PageContainer className="max-w-[720px]">
      <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.01em] text-fg">Publicar un objeto</h1>
      <p className="mt-2 text-[15px] text-fg-2">Cuanto más concreto, más fácil es que coincida con otra publicación</p>

      <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-12">
        <div role="radiogroup" aria-label="Qué pasó" className="grid gap-3 sm:grid-cols-2">
          {TYPE_OPTIONS.map((option) => {
            const selected = option.value === type
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setType(option.value)}
                className={cx(
                  'flex gap-3 rounded-xl border p-4 text-left transition-[background-color,border-color] duration-150',
                  selected ? 'border-accent-ink bg-accent-soft' : 'border-line-strong bg-surface hover:bg-raised',
                )}
              >
                <span className="mt-0.5">
                  <ZoneGlyph type={option.value} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-fg">{option.title}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-fg-2">{option.hint}</span>
                </span>
              </button>
            )
          })}
        </div>

        <Section title="Qué es">
          <Field label="Título" error={errors.title}>
            {(props) => (
              <Input
                {...props}
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'LOST' ? 'Billetera de cuero marrón' : 'Llaves con llavero de madera'}
              />
            )}
          </Field>
          <Field label="Categoría" error={errors.category}>
            {(props) => (
              <Select {...props} value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)}>
                <option value="" disabled>
                  Elegí una
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Descripción"
            optional
            hint={
              type === 'FOUND'
                ? 'Contá rasgos generales. Los detalles que prueban de quién es van en las preguntas de abajo'
                : 'Dónde estabas, cómo es, qué tenía. Todo ayuda a encontrar coincidencias'
            }
          >
            {(props) => (
              <Textarea
                {...props}
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Color" optional>
              {(props) => <Input {...props} value={color} maxLength={40} onChange={(e) => setColor(e.target.value)} />}
            </Field>
            <Field label="Marca" optional>
              {(props) => <Input {...props} value={brand} maxLength={40} onChange={(e) => setBrand(e.target.value)} />}
            </Field>
          </div>
        </Section>

        <Section title={type === 'LOST' ? 'Cuándo y dónde lo perdiste' : 'Cuándo y dónde lo encontraste'}>
          <Field label="Fecha y hora aproximada" error={errors.occurredAt}>
            {(props) => (
              <Input
                {...props}
                type="datetime-local"
                value={occurredAt}
                max={openedAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="sm:max-w-64"
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-fg">Zona</span>
              <Button variant="ghost" size="sm" onClick={locateMe} loading={locating}>
                {!locating && <LocateFixed {...icon} />}
                Usar mi ubicación
              </Button>
            </div>
            <div
              className={cx(
                'h-[320px] overflow-hidden rounded-xl border bg-raised',
                errors.location ? 'border-negative' : 'border-line-strong',
              )}
            >
              <PickerMap value={location} radiusM={radiusM} onChange={setLocation} className="size-full" />
            </div>
            <p className={cx('text-[13px] leading-5', errors.location ? 'text-negative' : 'text-fg-3')}>
              {errors.location ??
                'Tocá el mapa donde creés que pasó. El punto exacto queda privado: los demás ven una zona de al menos 300 m'}
            </p>
          </div>

          <Field
            label="Qué tan seguro estás del lugar"
            hint={`Los demás ven una zona de ${formatDistance(publicZoneRadius(radiusM))} de radio`}
          >
            {(props) => (
              <div className="flex items-center gap-4">
                <input
                  {...props}
                  type="range"
                  min={50}
                  max={1500}
                  step={50}
                  value={radiusM}
                  onChange={(e) => setRadiusM(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)]"
                />
                <span className="w-16 text-right font-mono text-[13px] text-fg-2 tabular">{formatDistance(radiusM)}</span>
              </div>
            )}
          </Field>
        </Section>

        {type === 'FOUND' && (
          <Section
            title="Preguntas para el dueño"
            description="Preguntá por algo que no se vea en la descripción, como qué hay adentro, una marca o el fondo de pantalla. Las respuestas esperadas solo las ves vos"
          >
            <ol className="flex flex-col gap-4">
              {questions.map((q, index) => (
                <li key={q.key} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
                  <div className="mb-3 flex h-8 items-center justify-between">
                    <span className="font-mono text-[12px] text-fg-3 tabular">Pregunta {index + 1}</span>
                    {questions.length > 1 && (
                      <IconButton
                        label={`Borrar pregunta ${index + 1}`}
                        className="size-8"
                        onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                      >
                        <Trash2 {...icon} />
                      </IconButton>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <Field label="Pregunta">
                      {(props) => (
                        <Input
                          {...props}
                          value={q.question}
                          maxLength={200}
                          placeholder="¿Qué tarjetas tiene adentro?"
                          onChange={(e) => updateQuestion(q.key, { question: e.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Respuesta esperada">
                      {(props) => (
                        <Input
                          {...props}
                          value={q.expectedAnswer}
                          maxLength={200}
                          onChange={(e) => updateQuestion(q.key, { expectedAnswer: e.target.value })}
                        />
                      )}
                    </Field>
                  </div>
                </li>
              ))}
            </ol>
            {errors.questions && <p className="text-[13px] text-negative">{errors.questions}</p>}
            {questions.length < 3 && (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() =>
                  setQuestions((qs) => [...qs, { key: Date.now(), question: '', expectedAnswer: '' }])
                }
              >
                <Plus {...icon} />
                Agregar pregunta
              </Button>
            )}
          </Section>
        )}

        {create.isError && <Notice tone="error">No pudimos publicar. Probá de nuevo</Notice>}

        <div className="flex items-center gap-3 border-t border-line pt-6">
          <Button type="submit" size="lg" loading={create.isPending}>
            Publicar
          </Button>
          <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-[17px] leading-6 font-medium text-fg">{title}</h2>
        {description && <p className="mt-1 max-w-[60ch] text-sm leading-5 text-fg-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}
