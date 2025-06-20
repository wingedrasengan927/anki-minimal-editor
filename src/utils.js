/* Helper function to strip delimiters from the start and end of a text string. */
function stripDelimiters(text, delimiterPairs) {
  if (!text || !delimiterPairs || delimiterPairs.length === 0) {
    return text;
  }
  for (const pair of delimiterPairs) {
    if (pair && pair.length === 2) {
      const openDel = pair[0];
      const closeDel = pair[1];
      if (text.startsWith(openDel) && text.endsWith(closeDel)) {
        return text.substring(openDel.length, text.length - closeDel.length);
      }
    }
  }
  return text;
}

const ANKI_DELIMITERS = [
  ["\\[", "\\]"],
  ["\\(", "\\)"],
];

/**
 * Processes note data to:
 * 1. Find image tags with data URLs, extract data, replace src.
 * 2. Transform specific math divs/spans to <anki-mathjax> elements.
 * - <div class="math-rendered" data-lexical-math="true">content</div>
 * becomes <anki-mathjax class="math-rendered" block="true" data-lexical-math="true">stripped_content</anki-mathjax>
 * - <span class="math-rendered" data-lexical-math="true">content</span>
 * becomes <anki-mathjax class="math-rendered" data-lexical-math="true">stripped_content</anki-mathjax>
 * 3. Strips specified delimiters from the content of these math tags.
 */
export function postProcessNoteData(
  fields,
  INLINE_DELIMITERS,
  DISPLAY_DELIMITERS
) {
  const pictures = [];
  const processedFields = { ...fields };

  // Default to empty arrays if delimiters are not provided, to avoid errors
  const inlineDelimPairs = INLINE_DELIMITERS || [];
  const displayDelimPairs = DISPLAY_DELIMITERS || [];

  for (const fieldName in fields) {
    let htmlString = fields[fieldName] || "";

    // Check for empty paragraph and replace with empty string
    if (htmlString === '<p class="medium-paragraph"><br></p>') {
      processedFields[fieldName] = "";
      continue;
    }

    if (typeof htmlString !== "string" || !htmlString.trim()) {
      processedFields[fieldName] = htmlString;
      continue;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const body = doc.body;

    // --- 1. Image Processing ---
    const images = body.querySelectorAll("img");
    images.forEach((imgElement) => {
      const src = imgElement.getAttribute("src");

      // Check if data-anki-filename attribute is present
      if (imgElement.hasAttribute("data-anki-filename")) {
        return;
      }

      if (src && src.startsWith("data:image/")) {
        const dataUrlMatch = src.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (dataUrlMatch && dataUrlMatch.length === 3) {
          const format = dataUrlMatch[1] || "png";
          const base64Data = dataUrlMatch[2];
          const randomFileName = `img_${Math.random()
            .toString(36)
            .substring(2, 9)}.${format.toLowerCase()}`;
          pictures.push({
            filename: randomFileName,
            data: base64Data,
          });
          imgElement.setAttribute("src", randomFileName);
        }
      }
    });

    // --- 2. MathJax SPAN Transformation (both block and inline) ---
    const mathSpans = body.querySelectorAll('span[data-lexical-math="true"]');
    mathSpans.forEach((span) => {
      // Check if this is block math (data-math-inline="false") or inline math (data-math-inline="true")
      const isInline = span.getAttribute("data-math-inline") === "true";

      let mathText;
      if (isInline) {
        // Inline math - use inline delimiters \\( \\)
        const strippedContent = stripDelimiters(
          span.textContent,
          inlineDelimPairs
        );
        const [openDelim, closeDelim] = ANKI_DELIMITERS[1]; // \\( \\)
        mathText = `${openDelim}${strippedContent}${closeDelim}`;
      } else {
        // Block math (data-math-inline="false") - use display delimiters \\[ \\]
        const strippedContent = stripDelimiters(
          span.textContent,
          displayDelimPairs
        );
        const [openDelim, closeDelim] = ANKI_DELIMITERS[0]; // \\[ \\]
        mathText = `${openDelim}${strippedContent}${closeDelim}`;
      }

      // Create a text node with the delimited math content
      const textNode = doc.createTextNode(mathText);

      if (span.parentNode) {
        span.parentNode.replaceChild(textNode, span);
      } else {
        console.warn(
          "Found a math span without a parentNode, cannot replace:",
          span
        );
      }
    });

    // --- 3. Serialization ---
    processedFields[fieldName] = decodeEntities(body.innerHTML);
  }

  return {
    processedFields,
    pictures,
  };
}

function decodeEntities(str) {
  const t = document.createElement('textarea');
  t.innerHTML = str;
  return t.value;
}


/**
 * Extracts image filenames from processed fields.
 */
export function extractPictures(fields) {
  const imageFilenames = [];

  for (const fieldName in fields) {
    const htmlString = fields[fieldName]["value"] || "";
    if (typeof htmlString !== "string" || !htmlString.trim()) {
      continue;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const body = doc.body;

    // Find all img elements and extract their src attributes
    const images = body.querySelectorAll("img");
    images.forEach((imgElement) => {
      const src = imgElement.getAttribute("src");
      // Check if src matches the pattern generated by postProcessNoteData
      if (src && src.match(/^img_[a-z0-9]{7}\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
        if (!imageFilenames.includes(src)) {
          imageFilenames.push(src);
        }
      }
    });
  }

  return imageFilenames;
}

/**
 * Replaces image src attributes with their corresponding base64 data URLs.
 */
export function replacePictureData(htmlContent, picturesData) {
  if (!htmlContent || typeof htmlContent !== "string" || !htmlContent.trim()) {
    return htmlContent;
  }

  if (!picturesData || Object.keys(picturesData).length === 0) {
    return htmlContent;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const body = doc.body;

  // Find all img elements and replace their src if we have the data
  const images = body.querySelectorAll("img");
  images.forEach((imgElement) => {
    const src = imgElement.getAttribute("src");

    // Check if we have data for this image filename
    if (src && picturesData[src]) {
      const imageData = picturesData[src];

      // Determine the MIME type from the filename extension
      const extension = src.split(".").pop().toLowerCase();
      const mimeType = getMimeType(extension);

      // Create data URL
      const dataUrl = `data:${mimeType};base64,${imageData}`;
      imgElement.setAttribute("src", dataUrl);

      // Set the existing filename
      if (!imgElement.hasAttribute("data-anki-filename")) {
        imgElement.setAttribute("data-anki-filename", src);
      }
    }
  });

  return body.innerHTML;
}

/**
 * Helper function to get MIME type from file extension
 */
function getMimeType(extension) {
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };

  return mimeTypes[extension] || "image/png";
}

/**
 * Replaces <anki-mathjax> elements back to their original span format.
 * This function reverses the math transformation done by postProcessNoteData.
 */
export function replaceMathTags(
  htmlContent,
  INLINE_DELIMITERS = [],
  DISPLAY_DELIMITERS = []
) {
  if (!htmlContent || typeof htmlContent !== "string" || !htmlContent.trim()) {
    return htmlContent;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const body = doc.body;

  // Find all anki-mathjax elements
  const ankiMathJaxElements = body.querySelectorAll("anki-mathjax");

  ankiMathJaxElements.forEach((ankiElement) => {
    const hasBlockAttribute = ankiElement.hasAttribute("block");
    const isBlock =
      hasBlockAttribute && ankiElement.getAttribute("block") === "true";

    // Create span element for both block and inline math
    const newElement = doc.createElement("span");

    // Add the required attributes
    newElement.setAttribute(
      "class",
      isBlock ? "math-rendered-block" : "math-rendered-inline"
    );
    newElement.setAttribute("data-lexical-math", "true");
    newElement.setAttribute("data-math-inline", isBlock ? "false" : "true");

    // Get the content and add appropriate delimiters
    let content = ankiElement.innerHTML;

    if (isBlock && DISPLAY_DELIMITERS.length > 0) {
      // Add display delimiters for block math (use first delimiter pair)
      const [openDelim, closeDelim] = DISPLAY_DELIMITERS[0];
      content = `${openDelim}${content}${closeDelim}`;
    } else if (!isBlock && INLINE_DELIMITERS.length > 0) {
      // Add inline delimiters for inline math (use first delimiter pair)
      const [openDelim, closeDelim] = INLINE_DELIMITERS[0];
      content = `${openDelim}${content}${closeDelim}`;
    }

    newElement.innerHTML = content;

    // Replace the anki-mathjax element with the new element
    if (ankiElement.parentNode) {
      ankiElement.parentNode.replaceChild(newElement, ankiElement);
    }
  });

  return body.innerHTML;
}
