import { schema, defaultMarkdownParser } from 'prosemirror-markdown'
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
          element.textContent = `§${level}`
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
  const lipsum = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ullamcorper purus nec nisl aliquet viverra. Nullam aliquet a ligula ut tincidunt. Integer nec sollicitudin turpis. Vivamus nunc mauris, dignissim id placerat vel, placerat et felis. Suspendisse vitae semper velit. Donec quis risus id orci sagittis varius a faucibus felis. Proin sit amet placerat justo. Nullam ac rutrum odio. Phasellus gravida enim quis fringilla tincidunt.

Vestibulum auctor purus lectus, non maximus velit laoreet molestie. Nulla facilisi. Suspendisse non massa odio. Aliquam lacinia lacus scelerisque ante hendrerit, a blandit purus cursus. Quisque tristique erat sit amet bibendum congue. Aenean varius at massa et fermentum. Quisque finibus nisi in orci tincidunt ultricies. Sed sit amet consequat erat. Aliquam erat volutpat. Suspendisse in lorem lacinia leo consectetur aliquet. Morbi ac ornare turpis, non venenatis lectus.

Morbi maximus vulputate facilisis. Nullam feugiat velit massa, id bibendum purus volutpat quis. Curabitur pellentesque nisl mi, vestibulum interdum ex sagittis quis. Duis efficitur porttitor quam, bibendum sodales lacus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Ut pellentesque velit non tortor accumsan vehicula. Nam pellentesque sodales placerat. Suspendisse in ipsum euismod, pharetra sapien luctus, faucibus elit. Proin viverra dictum ante, et rutrum tellus mollis et. Sed dignissim, felis ac consectetur efficitur, odio tortor pretium mi, sed sagittis tortor turpis nec erat. Maecenas pellentesque lobortis pretium. Cras pulvinar sapien eu justo tristique euismod. Ut et risus et ipsum tincidunt convallis at at metus. Proin sit amet nisl pretium, tincidunt orci dapibus, malesuada augue. Quisque posuere porta ornare.

Phasellus felis sem, egestas ut quam a, molestie faucibus tortor. Cras hendrerit tincidunt lacus sit amet placerat. Nulla quis urna sit amet urna tincidunt ullamcorper. Nunc sit amet sem vitae ligula varius ultricies. Ut in leo dictum, hendrerit leo ut, faucibus libero. Quisque consectetur lacus sit amet tellus lacinia cursus. Praesent laoreet convallis risus, nec ultricies diam faucibus sed. Nunc eu mauris neque. Etiam ultricies, arcu vel ultricies luctus, tellus dui elementum odio, vel dignissim ante leo at orci. Vivamus ornare diam in dapibus accumsan. Ut ante enim, sollicitudin mattis aliquam vitae, commodo vitae metus. Vivamus consectetur imperdiet porta. Nam lectus quam, finibus eu pulvinar non, tempus ut neque. Vivamus eu hendrerit lorem, nec aliquet ex. Quisque a sapien ullamcorper, fringilla ex at, lacinia nisi.

Donec blandit sed lacus a efficitur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Curabitur sed scelerisque dolor. Maecenas porttitor, ex in vulputate molestie, diam mauris pellentesque nisi, rhoncus pulvinar sapien risus in nulla. Vestibulum maximus nunc non tortor tincidunt, non convallis erat volutpat. Vivamus et consectetur nunc. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Sed sapien justo, maximus eu facilisis nec, imperdiet quis erat. Phasellus rhoncus condimentum ex at bibendum.
  `.trim()
  const state = window.state = EditorState.create({
    schema,
    plugins,
    doc: defaultMarkdownParser.parse(lipsum)
  })
  window.editor = new EditorView(document.body, {
    autofocus: true,
    spellcheck: true,
    lineWrapping: true,
    state
  })
})
