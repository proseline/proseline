// Predicates to check expiration dates.

export const csrfToken = dateString => expired({
  dateString,
  lifetime: days(7)
})

export const accountLock = dateString => expired({
  dateString,
  lifetime: days(1)
})

export const changeEMailToken = dateString => expired({
  dateString,
  lifetime: hours(1)
})

export const confirmAccountToken = dateString => expired({
  dateString,
  lifetime: days(1)
})

export const resetPasswordToken = dateString => expired({
  dateString,
  lifetime: hours(1)
})

const actionToExpiration = {
  confirm: confirmAccountToken,
  email: changeEMailToken,
  reset: resetPasswordToken
}

export const token = token => {
  const predicate = actionToExpiration[token.action]
  if (!predicate) return false
  return predicate(token.created)
}

function days (days) {
  return days * hours(24)
}

function hours (hours) {
  return hours * 60 * 60 * 1000
}

function expired ({ dateString, lifetime }) {
  const now = Date.now()
  const date = Date.parse(dateString)
  return (now - date) > lifetime // days * 24 * 60 * 60 * 1000
}
