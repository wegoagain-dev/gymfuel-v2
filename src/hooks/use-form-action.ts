"use client"

import { startTransition, useActionState, type FormEvent } from "react"

/**
 * useActionState for <form onSubmit>. React resets uncontrolled fields after a
 * `<form action>` submission, which wiped what people typed whenever the server
 * rejected the form. Submitting through onSubmit keeps their input on errors.
 */
export function useFormAction<State>(action: (state: Awaited<State>, data: FormData) => State | Promise<State>, initialState: Awaited<State>) {
  const [state, dispatch, pending] = useActionState(action, initialState)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(() => dispatch(data))
  }
  return [state, onSubmit, pending] as const
}
