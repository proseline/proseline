import { schema } from 'prosemirror-markdown'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { exampleSetup } from 'prosemirror-example-setup'

document.addEventListener('DOMContentLoaded', () => {
  const state = window.state = EditorState.create({
    schema,
    plugins: exampleSetup({ schema })
  })
  window.editor = new EditorView(document.body, {
    autofocus: true,
    spellcheck: true,
    lineWrapping: true,
    state
  })
})
