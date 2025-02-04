
function Image(el)
  el.src = el.src:gsub("%.jpeg$", ".jpg")
  el.src = el.src:gsub("%.png$", ".jpg")
  return el
end
