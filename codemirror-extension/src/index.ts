import { Extension, Facet, RangeSetBuilder } from '@codemirror/state';

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';

// Defines new styles for this extension
const baseTheme = EditorView.baseTheme({
  // We need to set some transparency because the stripe are above
  // the selection layer
  '&light .cm-zebraStripe': { backgroundColor: '#d4fafaaa' },
  '&dark .cm-zebraStripe': { backgroundColor: '#1a2727aa' }
});

// Resolve step to use in the editor
const stepSize = Facet.define<number, number>({
  combine: values => (values.length ? Math.min(...values) : 2)
});

// Add decoration to editor lines
const stripe = Decoration.line({
  attributes: { class: 'cm-zebraStripe' }
});

// Create the range of lines requiring decorations
function stripeDeco(view: EditorView) {
  const step = view.state.facet(stepSize);
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      if (line.number % step === 0) {
        builder.add(line.from, line.from, stripe);
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

// Update the decoration status of the editor view
const showStripes = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = stripeDeco(view);
    }

    update(update: ViewUpdate) {
      // Update the stripes if the document changed,
      // the viewport changed or the stripes step changed.
      const oldStep = update.startState.facet(stepSize);
      if (
        update.docChanged ||
        update.viewportChanged ||
        oldStep !== update.view.state.facet(stepSize)
      ) {
        this.decorations = stripeDeco(update.view);
      }
    }
  },
  {
    decorations: v => v.decorations
  }
);

// Full extension composed of elemental extensions
export function zebraStripes(options: { step?: number } = {}): Extension {
  return [
    baseTheme,
    typeof options.step !== 'number' ? [] : stepSize.of(options.step),
    showStripes
  ];
}

/**
 * Initialization data for the @jupyterlab-examples/codemirror-extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-examples/codemirror-extension:plugin',
  description: 'A minimal JupyterLab extension adding a CodeMirror extension.',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  activate: (app: JupyterFrontEnd, extensions: IEditorExtensionRegistry) => {
    // Register a new editor configurable extension
    extensions.addExtension(
      Object.freeze({
        name: '@jupyterlab-examples/codemirror:zebra-stripes',
        // Default CodeMirror extension parameters
        default: 2,
        factory: () =>
          // The factory will be called for every new CodeMirror editor
          EditorExtensionRegistry.createConfigurableExtension((step: number) =>
            zebraStripes({ step })
          ),
        // JSON schema defining the CodeMirror extension parameters
        schema: {
          type: 'number',
          title: 'Show stripes',
          description:
            'Display zebra stripes every "step" in CodeMirror editors.'
        }
      })
    );
  }
};

export default plugin;
