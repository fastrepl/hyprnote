We use Sentry for watching for errors in our deployed application, as well as for instrumentation of our application.

## Error collection

Error collection is automatic and configured in `src/router.tsx`.

## Instrumentation

We want our server functions instrumented. So if you see a function name like `createServerFn`, you can instrument it with Sentry. You'll need to import `Sentry`:

```tsx
import * as Sentry from '@sentry/tanstackstart-react'
```

And then wrap the implementation of the server function with `Sentry.startSpan`, like so:

```tsx
Sentry.startSpan({ name: 'Requesting all the pokemon' }, async () => {
  // Some lengthy operation here
  await fetch('https://api.pokemon.com/data/')
})
```
