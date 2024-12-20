function gridCellDimensions() {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.height = "var(--line-height)";
  element.style.width = "1ch";
  document.body.appendChild(element);
  const rect = element.getBoundingClientRect();
  document.body.removeChild(element);
  return { width: rect.width, height: rect.height };
}

function setHeightFromRatio(media, ratio) {
  const cell = gridCellDimensions();
  const rect = media.getBoundingClientRect();
  const realHeight = rect.width / ratio;
  const diff = cell.height - (realHeight % cell.height);
  media.style.setProperty("padding-bottom", `${diff}px`);
}

// Add padding to each media to maintain grid.
function adjustMediaPadding() {
  const cell = gridCellDimensions();

  function setFallbackHeight(media) {
    const rect = media.getBoundingClientRect();
    const height = Math.round(rect.width / 2 / cell.height) * cell.height;
    media.style.setProperty("height", `${height}px`);
  }

  function onMediaLoaded(media) {
    var width, height;
    switch (media.tagName) {
      case "IMG":
        width = media.naturalWidth;
        height = media.naturalHeight;
        break;
      case "VIDEO":
        width = media.videoWidth;
        height = media.videoHeight;
        break;
    }
    if (width > 0 && height > 0) {
      setHeightFromRatio(media, width / height);
    } else {
      setFallbackHeight(media);
    }
  }

  const medias = document.querySelectorAll("img, video");
  for (media of medias) {
    switch (media.tagName) {
      case "IMG":
        if (media.complete) {
          onMediaLoaded(media);
        } else {
          media.addEventListener("load", () => onMediaLoaded(media));
          media.addEventListener("error", function () {
            setFallbackHeight(media);
          });
        }
        break;
      case "VIDEO":
        switch (media.readyState) {
          case HTMLMediaElement.HAVE_CURRENT_DATA:
          case HTMLMediaElement.HAVE_FUTURE_DATA:
          case HTMLMediaElement.HAVE_ENOUGH_DATA:
            onMediaLoaded(media);
            break;
          default:
            media.addEventListener("loadeddata", () => onMediaLoaded(media));
            media.addEventListener("error", function () {
              setFallbackHeight(media);
            });
            break;
        }
        break;
    }
  }
}
function getSvgRatio(svg) {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const [, , width, height] = viewBox.split(" ").map(Number);
    return width / height;
  }

  // Fallback to width/height attributes if no viewBox
  const width = svg.getAttribute("width");
  const height = svg.getAttribute("height");
  if (width && height) {
    return parseFloat(width) / parseFloat(height);
  }

  return null; // Can't determine ratio
}

function transformSvgImages() {
  const images = document.querySelectorAll('img[src$=".svg"]');

  images.forEach((img) => {
    try {
      const object = document.createElement("object");
      object.setAttribute("type", "image/svg+xml");
      object.setAttribute("data", img.src);

      object.onload = () => {
        const svgDoc = object.getSVGDocument();
        if (svgDoc) {
          const textElements = svgDoc.querySelectorAll("text");
          textElements.forEach((text) => {
            text.removeAttribute("font-family");
            text.removeAttribute("font-size");
            text.removeAttribute("fill");
          });

          // Get the SVG element
          const svg = svgDoc.querySelector("svg");
          window.svg = svg;
          if (svg) {
            svg.removeAttribute("width");
            svg.removeAttribute("height");
            svg.setAttribute("width", svg.viewBox.baseVal.width + "px");

            // Replace object with the modified SVG
            object.parentNode?.replaceChild(svg, object);
            const ratio = getSvgRatio(svg);
            console.log(svg, ratio);
            setHeightFromRatio(svg, ratio);
          }
        }
      };

      object.onerror = () => {
        console.error(`Failed to load SVG: ${img.src}`);
        if (object.parentNode) {
          object.parentNode.replaceChild(img.cloneNode(true), object);
        }
      };

      img.parentNode?.replaceChild(object, img);
    } catch (error) {
      console.error(`Error transforming image: ${img.src}`, error);
    }
  });
}

adjustMediaPadding();
window.addEventListener("load", transformSvgImages());
window.addEventListener("load", adjustMediaPadding);
window.addEventListener("resize", adjustMediaPadding);

function checkOffsets() {
  const ignoredTagNames = new Set([
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TD",
    "TH",
  ]);
  const cell = gridCellDimensions();

  const elements = document.querySelectorAll(
    "body :not(.debug-grid, .debug-toggle)",
  );
  for (const element of elements) {
    if (ignoredTagNames.has(element.tagName)) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    const offset = top % (cell.height / 2);
    if (offset > 0) {
      element.classList.add("off-grid");
      console.error(
        "Incorrect vertical offset for",
        element,
        "with remainder",
        top % cell.height,
        "when expecting divisible by",
        cell.height / 2,
      );
    } else {
      element.classList.remove("off-grid");
    }
  }
}

const debugToggle = document.querySelector(".debug-toggle");
function onDebugToggle() {
  document.body.classList.toggle("debug", debugToggle.checked);
}
debugToggle.addEventListener("change", onDebugToggle);
onDebugToggle();
