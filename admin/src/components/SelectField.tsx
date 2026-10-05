import { Field, SingleSelect } from "@strapi/design-system"
import type { ReactNode } from "react"

export const SelectField = ({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) => {
  return (
    <Field.Root name={name}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect value={value || null} onChange={(next) => onChange(String(next))}>
        {children}
      </SingleSelect>
    </Field.Root>
  )
}
