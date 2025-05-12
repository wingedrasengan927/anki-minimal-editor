import FieldEditor from "../FieldEditor/FieldEditor";
import { TagGroup, TagList, Tag, Label, Button } from "react-aria-components";
import "./note-editor.css";
import { $generateHtmlFromNodes } from "@lexical/html";
import { CLEAR_EDITOR_COMMAND } from "lexical";
import React, { forwardRef, useImperativeHandle, useRef } from "react";

const NoteEditor = forwardRef(function NoteEditor(
  {
    fieldNames,
    tags = [],
    initialSelectedTags = [],
    initialNoteData = {},
    onChangeNoteData,
    onChangeTags,
  },
  ref
) {
  const editorRefs = useRef({});

  // Collect fields’ HTML and pass it up via onChangeNoteData
  const handleAdd = () => {
    const newData = {};
    fieldNames.forEach((fieldName) => {
      const editor = editorRefs.current[fieldName];

      if (editor) {
        editor.read(() => {
          newData[fieldName] = $generateHtmlFromNodes(editor, null);
        });
      }
    });
    onChangeNoteData?.(newData);
  };

  const handleClear = () => {
    fieldNames.forEach((fieldName) => {
      const editor = editorRefs.current[fieldName];
      if (editor) {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
      }
    });
  };

  useImperativeHandle(ref, () => ({
    clearNote: handleClear,
  }));

  return (
    <div className="note-editor">
      <div className="fields">
        {fieldNames.map((fieldName) => (
          <FieldEditor
            key={fieldName}
            label={fieldName}
            setEditorRef={(ref) => {
              editorRefs.current[fieldName] = ref;
            }}
          />
        ))}
      </div>

      {tags.length > 0 && (
        <TagGroup
          selectionMode="multiple"
          selectedKeys={initialSelectedTags}
          onSelectionChange={onChangeTags}
        >
          <Label>Tags</Label>
          <TagList>
            {tags.map((tag) => (
              <Tag id={tag} key={tag}>
                {tag}
              </Tag>
            ))}
          </TagList>
        </TagGroup>
      )}

      {fieldNames.length > 0 && (
        <div className="action-btn-grp">
          <Button className="note-clear-tags" onPress={() => onChangeTags([])}>
            Clear Tags
          </Button>
          <Button className="note-clear" onPress={handleClear}>
            Clear
          </Button>
          <Button className="note-add" onPress={handleAdd}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
});

export default NoteEditor;
