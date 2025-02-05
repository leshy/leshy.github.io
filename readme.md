# builder for https://leshy.github.io

workflow checks out content from https://github.com/leshy/web/
runs the builder within a nix env
builder then optimizes images, compiles org files into html using pandoc, etc
