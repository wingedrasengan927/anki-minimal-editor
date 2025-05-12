import { useState, useRef, useEffect } from "react";
import { Button, Link } from "react-aria-components";
import { IconMenu2, IconX, IconBrandGithub } from "@tabler/icons-react";
import "./sidebar.css";

export default function Sidebar({
  children,
  minWidth = 200,
  maxWidth = 500,
  defaultWidth = 250,
  collapsedWidth = 60,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const sidebarRef = useRef(null);
  const dragHandleRef = useRef(null);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(width);

    // Add dragging class to body for global styling during drag
    document.body.classList.add("sidebar-dragging");
  };

  useEffect(() => {
    const handleDrag = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth + deltaX)
        );
        setWidth(newWidth);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.classList.remove("sidebar-dragging");

      // Add a subtle animation when releasing the drag
      if (sidebarRef.current) {
        sidebarRef.current.classList.add("sidebar-resize-end");
        setTimeout(() => {
          if (sidebarRef.current) {
            sidebarRef.current.classList.remove("sidebar-resize-end");
          }
        }, 300);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", handleDragEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, startX, startWidth, minWidth, maxWidth]);

  return (
    <div className="sidebar-container">
      <div
        ref={sidebarRef}
        className={`sidebar ${isOpen ? "open" : "closed"} ${
          isDragging ? "dragging" : ""
        }`}
        style={{ width: isOpen ? `${width}px` : `${collapsedWidth}px` }}
      >
        {isOpen && (
          <div className="sidebar-topbar">
            <Button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <IconX size={21} />
            </Button>
          </div>
        )}
        {!isOpen && (
          <>
            <Button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <IconMenu2 size={24} />
            </Button>
            <Link
              className="link-button"
              href="https://adobe.com/"
              target="_blank"
            >
              <IconBrandGithub size={24} />
            </Link>
          </>
        )}
        <div
          className="sidebar-content"
          style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
        >
          {children}
        </div>
        <div
          ref={dragHandleRef}
          className={`drag-handle ${isDragging ? "active" : ""}`}
          onMouseDown={handleDragStart}
          title="Drag to resize"
        >
          <div className="drag-handle-indicator"></div>
        </div>
      </div>
    </div>
  );
}
