function split_string(str, delimiter)
    local result = {}
    for match in (str .. delimiter):gmatch("(.-)" .. delimiter) do
        -- Trim leading and trailing spaces and add to result
        table.insert(result, match:match("^%s*(.-)%s*$"))
    end
    return result
end

local function debug(msg)
    io.stderr:write("DEBUG: " .. msg .. "\n")
    io.stderr:flush()
end

function get_metadata_from_blocks(blocks)
    local metadata = {}
    for _, block in ipairs(blocks) do
        if block.t == "RawBlock" and block.format == "org" then
            local key, value = block.text:match("^#%+([%w_]+):%s*(.-)%s*$")
            if key then
                metadata[string.lower(key)] = value
            end
        elseif block.t ~= "RawBlock" then
            -- Stop processing when we hit a non-raw block
            break
        end
    end
    return metadata
end

function Pandoc(doc)
    local metadata = get_metadata_from_blocks(doc.blocks)
    
    -- Merge found metadata with existing metadata
    for k, v in pairs(metadata) do
        if not doc.meta[k] then
            if k == "tags" then
                doc.meta[k] = pandoc.List(split_string(v, ","))
            else
                doc.meta[k] = v
            end
            --debug("Added metadata to document: " .. k .. " = " .. v)
        end
    end
    
    return doc
end

