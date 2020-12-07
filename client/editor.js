import { schema } from 'prosemirror-markdown'
import { EditorState } from 'prosemirror-state'
import { undo, redo, history } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import { EditorView } from 'prosemirror-view'

let state, editor
document.addEventListener('DOMContentLoaded', () => {
  state = EditorState.create({
    schema,
    plugins: [
      history(),
      keymap({ 'Mod-z': undo, 'Mod-y': redo })
    ]
  })
  editor = new EditorView(document.body, { state })
})
