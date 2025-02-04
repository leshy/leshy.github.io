function CodeBlock(el)
  -- Print the element for debugging
  -- print("\nDEBUG: CodeBlock encountered")
  -- print(pandoc.utils.stringify(el))


  -- print(el.attr.classes[1])
  if el.attr.classes[1] == "raw" then
    return pandoc.RawBlock("html", "<figure><pre>" .. el.text .. "</pre></figure>")
  end


  if el.attr.classes[1] == "example" then
    return pandoc.RawBlock("html", "<figure><pre>" .. el.text .. "</pre></figure>")
  end


  if el.attr.classes[1] == "scadclj" then
    el.attr.classes = {"clojure"}
  end
  
  local rendered = pandoc.write(
    pandoc.Pandoc({ pandoc.CodeBlock(el.text, el.attr) }), -- Wrap block in a document
    "html"
  )
  
local function countLines(text)
  local count = 1
  for _ in text:gmatch("\n") do
    count = count + 1
  end
  return count
end


if countLines(el.text) > 5 then
  return pandoc.RawBlock("html", '<details><summary> ' ..
                       pandoc.utils.stringify(el.classes) ..
                       ' code block</summary><code>' ..
                       rendered ..
                       '</code></details>')
else
  return pandoc.RawBlock("html", '<code>' .. rendered .. '</code>')
  -- return pandoc.RawBlock("html", '<summary>' .. pandoc.utils.stringify(el.classes) .. '</summary><code>' .. rendered .. '</code>')
end

end

