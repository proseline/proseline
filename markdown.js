// Render Markdown as HTML.

import { Parser, HtmlRenderer } from 'commonmark'

export default markup => {
  const reader = new Parser()
  const writer = new HtmlRenderer({ safe: true })
  const parsed = reader.parse(markup)
  return writer.render(parsed)
}
