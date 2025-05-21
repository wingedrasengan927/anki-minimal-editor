import {
  Autocomplete,
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select,
  SelectValue,
  useFilter,
} from "react-aria-components";
import {
  IconCheck,
  IconSelector,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

import "./notes-search.css";

export default function AnkiNotesSearch({ noteData, onNoteIDSelect }) {
  let { contains } = useFilter({ sensitivity: "base" });
  const [parsedNotes, setParsedNotes] = useState([]);

  useEffect(() => {
    if (noteData && Array.isArray(noteData)) {
      const parsed = parseNoteData(noteData);
      setParsedNotes(parsed);
    }
  }, [noteData]);

  const parseNoteData = (notes) => {
    return notes.map((note) => {
      const fieldValues = Object.entries(note.fields || {})
        .map(([_, fieldData]) => fieldData.value)
        .filter(Boolean)
        .join(" ");

      return {
        id: note.noteId,
        value: String(note.noteId),
        textValue: `${note.noteId} ${fieldValues}`,
      };
    });
  };

  return (
    <div>
      <Select
        className="anki-notes-select"
        placeholder="select a note"
        onSelectionChange={onNoteIDSelect}
      >
        <div className="anki-notes-label-row">
          <Label className="anki-notes-label">{"Notes"}</Label>
        </div>
        <Button className="anki-notes-select-btn">
          <SelectValue className="anki-notes-select-val" />
          <IconSelector size={21} />
        </Button>
        <Popover className="anki-notes-popover">
          <Autocomplete filter={contains}>
            <SearchField
              className="anki-notes-search-field"
              aria-label="Search"
              autoFocus
            >
              <IconSearch className="anki-notes-search-icon" />
              <Input
                className="anki-notes-search-input"
                placeholder="Search note content"
              />
              <Button className="anki-notes-search-clear-btn">
                <IconX size={16} />
              </Button>
            </SearchField>
            <ListBox className="anki-notes-listbox" items={parsedNotes}>
              {(item) => (
                <ListBoxItem
                  className="anki-notes-listitem"
                  textValue={item.textValue}
                  id={item.id}
                >
                  {({ isSelected }) => (
                    <>
                      <span className="anki-notes-listitem-label">
                        {item.value}
                      </span>
                      <span className="anki-notes-listitem-check">
                        {isSelected && <IconCheck size={16} />}
                      </span>
                    </>
                  )}
                </ListBoxItem>
              )}
            </ListBox>
          </Autocomplete>
        </Popover>
      </Select>
    </div>
  );
}
