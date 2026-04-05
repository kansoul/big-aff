---
title: Calculate Derived State During Rendering
impact: MEDIUM
impactDescription: avoids redundant renders and state drift
tags: rerender, derived-state, useEffect, state
---

## Calculate Derived State During Rendering

If a value can be computed from current props/state, do not store it in state or update it in an effect. Derive it during render to avoid extra renders and state drift. Do not set state in effects solely in response to prop changes; prefer derived values or keyed resets instead.

**Incorrect (redundant state and effect):**

```tsx
function Form() {
  const [name, setName] = useState('')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(`Hello, ${name.trim()}`)
  }, [name])

  return <p>{greeting}</p>
}
```

**Correct (derive during render):**

```tsx
function Form() {
  const [name, setName] = useState('')
  const greeting = `Hello, ${name.trim()}`

  return <p>{greeting}</p>
}
```

References: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
