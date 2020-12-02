// Roll journal entries up into single S3 objects of
// multiple entries for faster reading.

// Given the index of an entry, return a range of entries to
// roll-up with it.
export const group = index => {
  if (index % 100 === 0) return { first: index - 99, last: index }
  if (index % 10 === 0) return { first: index - 9, last: index }
  return false
}

// Given the index of an entry and the current head of its
// journal, return the last index in a roll-up that includes
// the requested entry and at least one more entry.
export const locate = (index, head) => {
  if (index > head) {
    throw new Error(`index ${index} greater than head ${head}`)
  }

  // The first entry is never rolled up.
  if (index === 0) return false

  // Indices divisible by 100 trigger 100-entry roll-ups.
  // However, reading a 100-entry roll-up for the last entry
  // is wasteful. Read the entry directly, instead.
  const hundredRemainder = index % 100
  if (hundredRemainder === 0) return false

  // Indices divisible by 10 trigger 10-entry roll-ups, but
  // may also appear in 100-entry roll-ups.
  const tenRemainder = index % 10
  if (tenRemainder === 0) {
    // In a 100-entry roll-up yet?
    //
    // For example, entry 80 could be in a 100-entry roll-up
    // ending with 100, rather than in its own 10-entry
    // roll-up ending with 80.
    const hundreds = Math.floor(index / 100)
    const nextHundred = (hundreds * 100) + 100
    if (head >= nextHundred) return nextHundred

    // Otherwise, it's in its own 10-entry roll-up.
    // But we're only intersted in the last entry in
    // that roll-up, so it's more efficient to read it
    // individually.
    return false
  }

  // In a 100-entry roll-up yet?
  const hundreds = Math.floor(index / 100)
  const nextHundred = (hundreds * 100) + 100
  if (head >= nextHundred) return nextHundred

  // In a 10-entry roll-up?
  const tens = Math.floor(index / 10)
  const nextTen = (tens * 10) + 10
  if (head >= nextTen) return nextTen

  return false
}
