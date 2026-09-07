import { basicSetup, EditorView } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'preact/hooks';

const syntaxHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syn-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--syn-string)' },
  { tag: [tags.number, tags.bool], color: 'var(--syn-number)' },
  { tag: tags.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: 'var(--syn-function)' },
  { tag: tags.variableName, color: 'var(--syn-variable)' },
  { tag: [tags.operator, tags.operatorKeyword], color: 'var(--syn-operator)' },
]);

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
        syntaxHighlighting(syntaxHighlightStyle),
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
