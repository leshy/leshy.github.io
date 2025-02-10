function Underline(el)
  if el.content[1] and el.content[1].text == "icon" and
     el.content[2] and el.content[2].tag == "Subscript" then
    return pandoc.RawInline('html', '<i class="fa fa-' .. el.content[2].content[1].text .. '"></i>')
  end
  return el
end

