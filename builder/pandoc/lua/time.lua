
local function debug(msg)
    io.stderr:write("DEBUG: " .. msg .. "\n\n\n")
    io.stderr:flush()
end


-- Function to convert date format
local function convert_date(date_string)
  -- Pattern to match "[YYYY-MM-DD Day]" format
  local pattern = "^%[(%d%d%d%d%-%d%d%-%d%d)%s%a+%]$"
  
  -- Check if the string matches the pattern
  local date = date_string:match(pattern)
  
  -- If there's a match, return the date part; otherwise, return the original string
  return date or date_string
end

-- Function to process metadata
local function process_metadata(meta)
  -- Check and process 'date' field
  if meta.created then
    meta.created = pandoc.MetaString(convert_date(tostring(meta.created)))
  end
  
  -- Check and process 'last_modified' field
  if meta.modified then
    meta.modified = pandoc.MetaString(convert_date(tostring(meta.modified)))
  end
  
  return meta
end

-- Main function
return {
  {
    Meta = process_metadata
  }
}

