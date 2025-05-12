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
    const htmlString = fields[fieldName] || "";
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
            format: format.toLowerCase(),
          });
          imgElement.setAttribute("src", randomFileName);
        }
      }
    });

    // --- 2. MathJax DIV Transformation (to <anki-mathjax block="true">) ---
    try {
      const mathDivs = body.querySelectorAll(
        'div.math-rendered[data-lexical-math="true"]'
      );
      mathDivs.forEach((div) => {
        const ankiMathJax = doc.createElement("anki-mathjax");
        for (const attr of Array.from(div.attributes)) {
          ankiMathJax.setAttribute(attr.name, attr.value);
        }
        ankiMathJax.setAttribute("block", "true");

        const originalInnerHTML = div.innerHTML;
        ankiMathJax.innerHTML = stripDelimiters(
          originalInnerHTML,
          displayDelimPairs
        );

        if (div.parentNode) {
          div.parentNode.replaceChild(ankiMathJax, div);
        } else {
          console.warn(
            "Found a math div without a parentNode, cannot replace:",
            div
          );
        }
      });
    } catch (e) {
      console.error("Error during MathJax DIV transformation:", e);
    }

    // --- 3. MathJax SPAN Transformation (to <anki-mathjax>) ---
    try {
      const mathSpans = body.querySelectorAll(
        'span.math-rendered[data-lexical-math="true"]'
      );
      mathSpans.forEach((span) => {
        const ankiMathJax = doc.createElement("anki-mathjax");
        for (const attr of Array.from(span.attributes)) {
          ankiMathJax.setAttribute(attr.name, attr.value);
        }

        const originalInnerHTML = span.innerHTML;
        ankiMathJax.innerHTML = stripDelimiters(
          originalInnerHTML,
          inlineDelimPairs
        );

        if (span.parentNode) {
          span.parentNode.replaceChild(ankiMathJax, span);
        } else {
          console.warn(
            "Found a math span without a parentNode, cannot replace:",
            span
          );
        }
      });
    } catch (e) {
      console.error("Error during MathJax SPAN transformation:", e);
    }

    // --- 4. Serialization ---
    processedFields[fieldName] = body.innerHTML;
  }

  return {
    processedFields,
    pictures,
  };
}
