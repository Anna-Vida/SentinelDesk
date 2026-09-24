export const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

export const shortId = (id: string) => id.slice(0, 8).toUpperCase()
