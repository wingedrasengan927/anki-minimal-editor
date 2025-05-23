import FieldEditor from "../FieldEditor/FieldEditor";
import { TagGroup, TagList, Tag, Label, Button } from "react-aria-components";
import "./note-editor.css";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { CLEAR_EDITOR_COMMAND, $getRoot, $insertNodes } from "lexical";
import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import {
  extractPictures,
  replacePictureData,
  replaceMathTags,
} from "../../utils";
import { INLINE_DELIMITERS, DISPLAY_DELIMITERS } from "../../App";

const NoteEditor = forwardRef(function NoteEditor(
  {
    fieldNames,
    tags = [], // Tags to be displayed
    selectedTags = [],
    noteData = {},
    onChangeTags,
    isEditing = false,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onNewNote,
    client,
  },
  ref
) {
  const editorRefs = useRef({});

  // Collect fields' HTML and pass it up via onAddNote
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
    onAddNote?.(newData);
  };

  const handleUpdate = () => {
    const newData = {};
    fieldNames.forEach((fieldName) => {
      const editor = editorRefs.current[fieldName];

      if (editor) {
        editor.read(() => {
          newData[fieldName] = $generateHtmlFromNodes(editor, null);
        });
      }
    });
    onUpdateNote?.(newData);
  };

  const handleClear = () => {
    fieldNames.forEach((fieldName) => {
      const editor = editorRefs.current[fieldName];
      if (editor) {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
      }
    });
  };

  const loadNoteData = async (noteData, client) => {
    // Clear existing content
    handleClear();

    // get the pictures from the noteData
    const picturesData = {};
    const picturesNames = extractPictures(noteData);

    if (picturesNames.length > 0) {
      for (const pictureName of picturesNames) {
        const pictureData = await client.media.retrieveMediaFile({
          filename: pictureName,
        });
        picturesData[pictureName] = pictureData;
      }
    }

    fieldNames.forEach((fieldName) => {
      const editor = editorRefs.current[fieldName];
      let htmlContent = noteData[fieldName]["value"] || "";

      // Replace image src with base64 data URLs
      htmlContent = replacePictureData(htmlContent, picturesData);

      // Replace math tags with their corresponding HTML
      htmlContent = replaceMathTags(
        htmlContent,
        INLINE_DELIMITERS,
        DISPLAY_DELIMITERS
      );

      if (editor && htmlContent) {
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlContent, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);

          $getRoot().selectStart();
          $insertNodes(nodes);
        });
      }
    });
  };

  // Initialize editors with content when they're available and noteData changes
  useEffect(() => {
    const hasEditors = Object.keys(editorRefs.current).length > 0;
    const hasData = Object.keys(noteData).length > 0;

    if (hasEditors && hasData) {
      loadNoteData(noteData, client);
    }
  }, [noteData, fieldNames]);

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
          selectedKeys={selectedTags}
          onSelectionChange={(keys) => onChangeTags(Array.from(keys))}
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

          {isEditing ? (
            <>
              <Button className="note-update" onPress={handleUpdate}>
                Update
              </Button>
              <Button className="note-delete" onPress={onDeleteNote}>
                Delete
              </Button>
              <Button className="note-new" onPress={onNewNote}>
                New Note
              </Button>
            </>
          ) : (
            <Button className="note-add" onPress={handleAdd}>
              Add
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default NoteEditor;
