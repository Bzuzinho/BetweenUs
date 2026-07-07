// 8.9 — catalog of known Shared Intentions (IntentAlignment) fields. Kept
// as a plain in-code constant, not a DB table, matching the note on
// IntentAlignmentItem in schema.prisma: the (key, value) pair itself is
// unconstrained String/String at the DB level so the catalog can grow
// without a migration, but this file is what routes/UI validate against
// and is the single place to add a new field or value.
//
// "Shared Intentions" is the product-facing name; IntentAlignment is the
// technical name only — this is explicitly NOT a legal contract (8.8),
// just a structured, versioned statement of what participants say they're
// looking for. Never conflate with Room Rules (in-room behaviour) or
// Consent Check (permission for one specific phase/action) — see 8.11.
export interface IntentFieldOption {
  value: string
  label: string
}

export interface IntentFieldDef {
  key: string
  label: string
  options: IntentFieldOption[]
}

export const INTENT_ALIGNMENT_FIELDS: IntentFieldDef[] = [
  {
    key: 'connection_goal',
    label: 'O que procuramos aqui',
    options: [
      { value: 'CHAT_ONLY', label: 'Só conversar' },
      { value: 'CASUAL', label: 'Algo casual' },
      { value: 'ONE_TIME', label: 'Um encontro pontual' },
      { value: 'RECURRING', label: 'Uma ligação recorrente' },
      { value: 'OPEN_TO_DISCOVER', label: 'Aberto/a a descobrir' }
    ]
  },
  {
    key: 'meeting_openness',
    label: 'Abertura a encontrarmo-nos',
    options: [
      { value: 'NOT_YET', label: 'Ainda não' },
      { value: 'MAYBE_LATER', label: 'Talvez mais tarde' },
      { value: 'OPEN_NOW', label: 'Aberto/a agora' }
    ]
  },
  {
    key: 'emotional_openness',
    label: 'Envolvimento emocional',
    options: [
      { value: 'NO_EMOTIONAL', label: 'Sem envolvimento emocional' },
      { value: 'OPEN_TO_EMOTIONAL', label: 'Aberto/a a envolvimento emocional' },
      { value: 'UNSURE', label: 'Ainda não sei' }
    ]
  },
  {
    key: 'recurrence',
    label: 'Frequência desejada',
    options: [
      { value: 'ONE_TIME', label: 'Uma única vez' },
      { value: 'OCCASIONAL', label: 'Ocasional' },
      { value: 'REGULAR', label: 'Regular' },
      { value: 'UNSURE', label: 'Ainda não sei' }
    ]
  },
  {
    key: 'confidentiality',
    label: 'Discrição',
    options: [
      { value: 'FULL_DISCRETION', label: 'Discrição total' },
      { value: 'KNOWN_CIRCLE_OK', label: 'Ok partilhar com círculo próximo' },
      { value: 'OPEN', label: 'Sem necessidade de discrição' }
    ]
  },
  {
    key: 'communication_pace',
    label: 'Ritmo de comunicação',
    options: [
      { value: 'SLOW', label: 'Devagar' },
      { value: 'STEADY', label: 'Constante' },
      { value: 'FREQUENT', label: 'Frequente' }
    ]
  }
]

export const INTENT_FIELD_KEYS = INTENT_ALIGNMENT_FIELDS.map(f => f.key)

export const isValidIntentField = (key: string, value: string): boolean => {
  const field = INTENT_ALIGNMENT_FIELDS.find(f => f.key === key)
  if (!field) return false
  return field.options.some(o => o.value === value)
}

export const labelForField = (key: string): string =>
  INTENT_ALIGNMENT_FIELDS.find(f => f.key === key)?.label || key

export const labelForValue = (key: string, value: string): string =>
  INTENT_ALIGNMENT_FIELDS.find(f => f.key === key)?.options.find(o => o.value === value)?.label || value
