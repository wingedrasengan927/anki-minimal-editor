import Sidebar from "./components/Sidebar/Sidebar";
import AnkiComboBox from "./components/AnkiComboBox/AnkiComboBox";
import { YankiConnect } from "yanki-connect";
import { useState, useEffect, useRef } from "react";
import { MathJaxContext } from "better-react-mathjax";
import NoteEditor from "./components/NoteEditor/NoteEditor";
import { ErrorModal } from "./components/AnkiComboBox/AnkiComboBox";
import { postProcessNoteData } from "./utils";
import AnkiNotesSearch from "./components/AnkiNotesSearch/AnkiNotesSearch";

import "./App.css";

const client = new YankiConnect({ autoLaunch: true });

export const INLINE_DELIMITERS = [
  ["$", "$"],
  ["\\(", "\\)"],
];

export const DISPLAY_DELIMITERS = [
  ["$$", "$$"],
  ["\\[", "\\]"],
];

const DEFAULT_TAG = "ankieditor";

export default function App() {
  const [deckName, setDeckName] = useState("");
  const [noteType, setNoteType] = useState("");
  const [fieldNames, setFieldNames] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([DEFAULT_TAG]);
  const [noteData, setNoteData] = useState({});
  const [error, setError] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const noteEditorRef = useRef(null);

  useEffect(() => {
    if (noteType) {
      client.model
        .modelFieldNames({ modelName: noteType })
        .then(setFieldNames)
        .catch(() => setFieldNames([]));

      client.note
        .getTags()
        .then(setTags)
        .catch(() => setTags([]));
    } else {
      setFieldNames([]);
      setTags([]);
    }
  }, [noteType]);

  const fetchNoteData = () => {
    if (deckName && noteType) {
      const query = `deck:"${deckName}" note:"${noteType}" tag:"${DEFAULT_TAG}"`;
      client.note
        .notesInfo({ query })
        .then((noteIds) => {
          setNoteData(noteIds);
        })
        .catch((err) => {
          setError(err.message || "Failed to fetch notes");
        });
    }
  };

  useEffect(() => {
    fetchNoteData();
  }, [deckName, noteType]);

  useEffect(() => {
    if (selectedNoteId) {
      client.note
        .notesInfo({ notes: [selectedNoteId] })
        .then((noteInfo) => {
          if (noteInfo && noteInfo.length > 0) {
            setSelectedNote(noteInfo[0]);
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to fetch note information");
        });
    } else {
      setSelectedNote(null);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    if (selectedNote) {
      if (selectedNote.tags && Array.isArray(selectedNote.tags)) {
        setSelectedTags(selectedNote.tags);
      }
    }
  }, [selectedNote]);

  const handleAddNote = async (data) => {
    const { processedFields, pictures } = postProcessNoteData(
      data,
      INLINE_DELIMITERS,
      DISPLAY_DELIMITERS
    );

    const note = {
      note: {
        deckName: deckName,
        modelName: noteType,
        fields: processedFields,
        tags: selectedTags,
      },
    };

    try {
      if (pictures.length > 0) {
        pictures.forEach((picture) => {
          client.media.storeMediaFile(picture);
        });
      }
      const noteId = await client.note.addNote(note, {
        options: { allowDuplicate: false },
      });

      // Transform fields from {"fieldName": data} to {"fieldName": {value: data}}
      const transformedFields = {};
      Object.keys(processedFields).forEach((fieldName) => {
        transformedFields[fieldName] = { value: processedFields[fieldName] };
      });

      const noteModified = {
        noteId: noteId,
        fields: transformedFields,
        tags: selectedTags,
        modelName: noteType,
      };

      setNoteData((prevNoteData) =>
        Array.isArray(prevNoteData)
          ? [...prevNoteData, noteModified]
          : [noteModified]
      );
      clearEditors();
    } catch (error) {
      setError(error.message || "An error occurred while adding the note.");
    }
  };

  const handleUpdateNote = async (data) => {
    const { processedFields, pictures } = postProcessNoteData(
      data,
      INLINE_DELIMITERS,
      DISPLAY_DELIMITERS
    );

    try {
      // Store any new media files
      if (pictures.length > 0) {
        for (const picture of pictures) {
          await client.media.storeMediaFile(picture);
        }
      }

      const note = {
        id: selectedNoteId,
        fields: processedFields,
        tags: selectedTags,
      };

      // Update the note
      await client.note.updateNote({ note });

      const transformedFields = {};
      Object.keys(processedFields).forEach((fieldName) => {
        transformedFields[fieldName] = { value: processedFields[fieldName] };
      });

      // Update noteData by removing old note and adding updated one
      setNoteData((prevNoteData) => {
        if (!Array.isArray(prevNoteData)) return [];

        // Remove the old note and add the updated one
        const filteredNotes = prevNoteData.filter(
          (note) => note.noteId !== selectedNoteId
        );

        const updatedNote = {
          noteId: selectedNoteId,
          fields: transformedFields,
          tags: selectedTags,
          modelName: noteType,
        };

        return [...filteredNotes, updatedNote];
      });

      // Clear the note editor
      setSelectedNoteId(null);
      setSelectedNote(null);
      clearEditors();
    } catch (error) {
      setError(error.message || "An error occurred while updating the note.");
    }
  };

  const handleDeleteNote = async () => {
    try {
      await client.note.deleteNotes({ notes: [selectedNoteId] });

      // Update noteData directly by filtering out the deleted note
      setNoteData((prevNoteData) =>
        Array.isArray(prevNoteData)
          ? prevNoteData.filter((note) => note.noteId !== selectedNoteId)
          : []
      );

      setSelectedNoteId(null);
      setSelectedNote(null);
      clearEditors();
    } catch (error) {
      setError(error.message || "An error occurred while deleting the note.");
    }
  };

  const clearEditors = () => noteEditorRef.current?.clearNote();

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setSelectedNote(null);
    setSelectedTags([DEFAULT_TAG]);
    clearEditors();
  };

  return (
    <div className="app">
      <Sidebar
        defaultWidth={250}
        minWidth={180}
        maxWidth={400}
        collapsedWidth={60}
      >
        <AnkiComboBox
          label="Decks"
          fetchData={client.deck.deckNames}
          handleSelectionChange={setDeckName}
        />
        <AnkiComboBox
          label="Note Types"
          fetchData={client.model.modelNames}
          handleSelectionChange={setNoteType}
        />
        {deckName && noteType && (
          <AnkiNotesSearch
            noteData={noteData}
            onNoteIDSelect={setSelectedNoteId}
            selectedNoteId={selectedNoteId}
          />
        )}
      </Sidebar>
      <MathJaxContext
        config={{
          tex: {
            inlineMath: INLINE_DELIMITERS,
            displayMath: DISPLAY_DELIMITERS,
            noundefined: {
              color: "red",
              background: "",
              size: "",
            },
          },
        }}
      >
        <main className="main-content">
          <h1 className="deck-heading">{deckName}</h1>
          <NoteEditor
            ref={noteEditorRef}
            fieldNames={fieldNames}
            tags={tags}
            selectedTags={selectedTags}
            onChangeTags={setSelectedTags}
            noteData={selectedNote?.fields}
            isEditing={!!selectedNoteId}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onNewNote={handleNewNote}
            client={client}
          />
        </main>
        {error && (
          <ErrorModal
            errorMsg={error}
            isOpen={!!error}
            onClose={() => setError(null)}
          />
        )}
      </MathJaxContext>
    </div>
  );
}
