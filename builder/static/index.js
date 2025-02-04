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

function getSvgWidthHeight(svg) {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const [, , width, height] = viewBox.split(" ").map(Number);
    return [width, height];
  }

  // Fallback to width/height attributes if no viewBox
  const width = parseFloat(getComputedStyle(svg).width);
  const height = parseFloat(getComputedStyle(svg).height);
  return [width, height];
}

function getSvgRatio(svg, width = undefined, height = undefined) {
  if (!(width && height)) {
    [width, height] = getSvgWidthHeight(svg);
  }

  if (width && height) {
    return width / height;
  }

  return null; // Can't determine ratio
}

function processWriteDocument(svg) {
  console.log("process Write", svg);

  //find internal element by id
  svg.querySelectorAll("#write-doc-background").forEach((element) => {
    element.removeAttribute("fill");
    element.removeAttribute("id");
    // add css class
    element.classList.add("write-doc-background");
  });

  // delete all elements with a class
  svg.querySelectorAll(".ruleline").forEach((element) => {
    element.remove();
  });

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  svg.querySelectorAll("path").forEach((path) => {
    const bbox = path.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Add some padding (e.g., 5%)
  const viewBox = [0, 0, width, height].join(" ");
  console.log("WRITE DOC VIEWBOX", viewBox);
  svg.setAttribute("viewBox", viewBox);

  svg.querySelectorAll("path").forEach((element) => {
    const fill = element.getAttribute("fill");
    if (fill == "#0000FF") {
      element.classList.add("blue");
      element.removeAttribute("fill");
    }
    if (fill == "#FF0000") {
      element.classList.add("red");
      element.removeAttribute("fill");
    }
    if (fill == "#008000") {
      element.classList.add("green");
      element.removeAttribute("fill");
    }

    if (fill == "#000000") {
      element.classList.add("fg");
      element.removeAttribute("fill");
    }
  });
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

          if (svg) {
            // Replace object with the modified SVG
            object.parentNode?.replaceChild(svg, object);
            const [width, height] = getSvgWidthHeight(svg);
            const ratio = getSvgRatio(svg, width, height);
            const id = svg.getAttribute("id");
            svg.removeAttribute("id");
            svg.removeAttribute("width");
            svg.removeAttribute("height");

            console.log(svg, width, height, ratio);
            setHeightFromRatio(svg, ratio);

            svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

            console.log(`0 0 ${width} ${height}`);
            if (id == "write-document") processWriteDocument(svg);
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
