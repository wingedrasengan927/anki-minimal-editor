import React, { useState, useEffect } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Dialog,
  Modal,
  Heading,
  ModalOverlay,
} from "react-aria-components";
import { IconCaretDownFilled, IconRefresh, IconX } from "@tabler/icons-react";
import "./combobox.css";

export function ErrorModal({ errorMsg, isOpen, onClose }) {
  return (
    <ModalOverlay
      className="error-modal-overlay"
      isOpen={isOpen}
      onOpenChange={onClose}
    >
      <Modal className="error-modal">
        <Dialog className="error-dialog">
          <Button className="error-modal-close" onPress={onClose}>
            <IconX size={16} />
          </Button>
          <Heading slot="title" className="error-heading">
            Error
          </Heading>
          <p>{errorMsg}</p>
          <p>
            <a
              href="https://ms-neerajkrishna.medium.com/79ae916f1127"
              target="_blank"
              rel="noopener noreferrer"
              className="error-docs-link"
            >
              View documentation for help
            </a>
          </p>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export default function AnkiComboBox({
  label,
  fetchData,
  handleSelectionChange,
  placeholder = "Select an option",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasError, setHasError] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setHasError(false);
      setError(null);
      const data = await fetchData();
      setItems(data || []);
    } catch (err) {
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fetchData]);

  if (error) {
    return (
      <ErrorModal
        errorMsg={error}
        isOpen={!!error}
        onClose={() => {
          setError(null);
          setHasError(true);
        }}
      />
    );
  }

  return (
    <div className="anki-combobox-container">
      <div className="anki-combobox-label-row">
        <Label className="anki-combobox-label">{label}</Label>
        <Button
          className="anki-combobox-refresh-btn"
          aria-label="Refresh"
          isDisabled={loading}
          onPress={loadData}
        >
          <IconRefresh size={16} />
        </Button>
      </div>
      <ComboBox
        aria-label={label}
        onSelectionChange={handleSelectionChange}
        className={"anki-combobox"}
        isDisabled={loading || hasError}
      >
        <div className="anki-combobox-input-grp">
          <Input
            className="anki-combobox-input"
            placeholder={
              loading
                ? "Loading..."
                : hasError
                ? error || "Error occurred"
                : placeholder
            }
          />
          <Button className="anki-combobox-btn">
            <IconCaretDownFilled size={21} />
          </Button>
        </div>
        <Popover className="anki-combobox-popover">
          <ListBox className="anki-combobox-listbox">
            {items.map((item) => (
              <ListBoxItem key={item} id={item}>
                {item}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </ComboBox>
    </div>
  );
}
