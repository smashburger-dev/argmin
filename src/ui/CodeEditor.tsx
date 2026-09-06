import { basicSetup, EditorView } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { useEffect, useRef } from 'preact/hooks';

export function CodeEditor({ initialValue, onChange }: { initialValue: string; onChange: (value: string) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      doc: initialValue,
      extensions: [
        basicSetup,
        python(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          'aria-label': 'Python-Codeeditor',
          'aria-describedby': 'editor-help',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    });
    return () => view.destroy();
  }, [initialValue]);

  return <div class="code-editor" ref={host} />;
}
