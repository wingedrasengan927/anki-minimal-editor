import Sidebar from "./components/Sidebar/Sidebar";
import AnkiComboBox from "./components/AnkiComboBox/AnkiComboBox";
import { YankiConnect } from "yanki-connect";
import { useState, useEffect, useRef } from "react";
import { MathJaxContext } from "better-react-mathjax";
import NoteEditor from "./components/NoteEditor/NoteEditor";
import { ErrorModal } from "./components/AnkiComboBox/AnkiComboBox";
import { postProcessNoteData } from "./utils";

import "./App.css";

const client = new YankiConnect();

const INLINE_DELIMITERS = [
  ["$", "$"],
  ["\\(", "\\)"],
];
const DISPLAY_DELIMITERS = [
  ["$$", "$$"],
  ["\\[", "\\]"],
];

export default function App() {
  const [deckName, setDeckName] = useState("");
  const [noteType, setNoteType] = useState("");
  const [fieldNames, setFieldNames] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(["anki-connect-test"]);
  const [noteData, setNoteData] = useState({});
  const [error, setError] = useState(null);
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

  const handleNoteDataChange = async (data) => {
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
      clearNoteData();
    } catch (error) {
      setError(error.message || "An error occurred while adding the note.");
    }
  };

  const clearNoteData = () => noteEditorRef.current?.clearNote();

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
            onChangeNoteData={handleNoteDataChange}
            initialSelectedTags={selectedTags}
            onChangeTags={setSelectedTags}
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
