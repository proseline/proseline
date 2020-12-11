import { schema } from 'prosemirror-markdown'
import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { exampleSetup } from 'prosemirror-example-setup'
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands'

class StylingPopup {
  constructor (view) {
    const buttons = [
      {
        command: toggleMark(schema.marks.strong),
        dom: (() => {
          const element = document.createElement('button')
          element.style.fontWeight = 'bold'
          element.textContent = 'B'
          return element
        })()
      },
      {
        command: toggleMark(schema.marks.em),
        dom: (() => {
          const element = document.createElement('button')
          element.style.fontStyle = 'italic'
          element.textContent = 'I'
          return element
        })()
      },
      {
        command: setBlockType(schema.nodes.paragraph),
        dom: (() => {
          const element = document.createElement('button')
          element.textContent = '¶'
          return element
        })()
      },
      {
        command: wrapIn(schema.nodes.blockquote),
        dom: (() => {
          const element = document.createElement('button')
          element.textContent = 'Q'
          return element
        })()
      },
      headingLevelButton(1),
      headingLevelButton(2),
      headingLevelButton(3),
      headingLevelButton(5),
      headingLevelButton(6)
    ]

    function headingLevelButton (level) {
      return {
        command: setBlockType(schema.nodes.heading, { level }),
        dom: (() => {
          const element = document.createElement('button')
          element.textContent = `H${level}`
          return element
        })()
      }
    }

    const element = this.element = document.createElement('div')
    element.className = 'popup'
    element.style.zIndex = 100
    element.style.position = 'absolute'
    element.style.display = 'none'
    buttons.forEach(({ dom }) => element.appendChild(dom))
    element.addEventListener('mousedown', event => {
      event.preventDefault()
      view.focus()
      buttons.forEach(({ command, dom }) => {
        if (dom.contains(event.target)) {
          command(view.state, view.dispatch, view)
        }
      })
    })
    view.dom.parentNode.appendChild(element)

    this.update(view, null)
  }

  update (view, lastState) {
    const state = view.state

    if (
      lastState &&
      lastState.doc.eq(state.doc) &&
      lastState.selection.eq(state.selection)
    ) return

    const element = this.element
    if (state.selection.empty) {
      element.style.display = 'none'
      return
    }

    element.style.display = ''
    const { from, to, head } = state.selection
    const forwards = head === to
    const fromCoordinates = view.coordsAtPos(from)
    const toCoordinates = view.coordsAtPos(to)
    const left = forwards
      ? toCoordinates.left
      : fromCoordinates.left
    const box = element.offsetParent.getBoundingClientRect()
    const bottom = forwards
      ? (box.bottom - toCoordinates.top)
      : (box.bottom - fromCoordinates.top)
    element.style.left = left + 'px'
    element.style.bottom = bottom + 'px'
  }

  destroy () {
    this.element.remove()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const plugins = exampleSetup({
    schema,
    history: true,
    menuBar: false
  })
  plugins.push(new Plugin({
    view (editorView) {
      return new StylingPopup(editorView)
    }
  }))
  const state = window.state = EditorState.create({ schema, plugins })
  window.editor = new EditorView(document.body, {
    autofocus: true,
    spellcheck: true,
    lineWrapping: true,
    state
  })
})
