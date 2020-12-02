// Render Markdown as HTML.

import commonmark from 'commonmark'

export default markup => {
  const reader = new commonmark.Parser()
  const writer = new commonmark.HtmlRenderer({ safe: true })
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
