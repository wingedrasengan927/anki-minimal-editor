import { useRef, useEffect } from "react";
import Editor from "lexical-medium-editor";
import { initialConfig } from "lexical-medium-editor/config";

import "./field-editor.css";

export default function FieldEditor({ label, setEditorRef }) {
  const editorStateRef = useRef(null);
  const internalEditorRef = useRef(null);

  const handleOnChange = (editorState) => {
    editorStateRef.current = editorState;
  };

  useEffect(() => {
    if (internalEditorRef.current && setEditorRef) {
      setEditorRef(internalEditorRef.current);
    }
  }, [setEditorRef]);

  return (
    <div className="field-editor">
      <span className="field-name">{label}</span>
      <div className="editor-wrapper">
        <Editor
          initialConfig={initialConfig}
          onChange={handleOnChange}
          editorRef={internalEditorRef}
          blockToolbarGap={32}
          isHeadingOneFirst={false}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
