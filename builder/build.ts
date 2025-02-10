import { serveDir } from "https://deno.land/std@0.206.0/http/file_server.ts"
import { serve } from "https://deno.land/std@0.206.0/http/server.ts"
import { parse } from "https://deno.land/std@0.206.0/flags/mod.ts"
import { basename, join } from "https://deno.land/std@0.206.0/path/mod.ts"

import gulp from "npm:gulp"
import pandoc from "npm:gulp-pandoc"
import filelog from "npm:gulp-filelog"
import image from "npm:gulp-image"
import newer from "npm:gulp-newer"
import gm from "npm:gulp-gm"
import ensureLibs from "./fixlibs.ts"

// Parse command line arguments with defaults
const args = parse(Deno.args, {
    string: ["src", "dest", "root"],
    boolean: ["watch", "serve", "help"],
    default: {
        dest: "./web",
        watch: false,
        serve: false,
        help: false,
        root: import.meta.dirname || Deno.cwd(),
    },
})

function printHelp() {
    console.log(`
Usage: ${basename(Deno.mainModule)} [options]

Options:
  --src <dir>     Source directory (required)
  --dest <dir>    Destination directory (default: ./web)
  --root <dir>    Root directory (default: current directory)
  --watch         Watch for changes (default: false)
  --serve         Serve the destination directory (default: false)
  --help          Show this help message

Example:
  script.ts --src ./source --dest ./output --watch
`)
}

if (args.help) {
    printHelp()
    Deno.exit(0)
}

if (!args.src) {
    printHelp()
    Deno.exit(1)
}

console.log(`Source directory: ${args.src}`)
console.log(`Destination directory: ${args.dest}`)

await ensureLibs()

const negate = (glob: string) => `!${glob}`
const extension = (...exts: string[]) =>
    `*.+(${[...exts, ...exts.map((x) => x.toUpperCase())].join("|")})`
const ignoresGlob = ["!**/.git/**"]

const contentDir = args.src + "/**/"
const destDir = args.dest

const orgGlob = contentDir + extension("org")
const imagesGlob = contentDir + extension("jpg", "jpeg", "png", "gif")
const svgGlob = contentDir + extension("svg")

const miscContentGlob = [`${contentDir}*`, negate(imagesGlob), negate(svgGlob)]

const staticDir = join(args.root, "static")
const pandocDir = join(args.root, "pandoc")

const glob = (stuff: string | string[]): string[] => {
    return Array.isArray(stuff)
        ? [...stuff, ...ignoresGlob]
        : [stuff, ...ignoresGlob]
}

function swallowError(error: Error) {
    console.log(error.toString())
    // @ts-ignore
    this.emit("end")
}

const taskStatic = () =>
    gulp
        .src(staticDir + "/**/*")
        .pipe(newer(destDir))
        .pipe(filelog("static copy"))
        .pipe(gulp.dest(destDir))

const taskSvg = () =>
    gulp
        .src(glob(svgGlob), { encoding: false })
        .pipe(newer(destDir))
        .pipe(filelog("svg"))
        .pipe(image())
        .on("error", swallowError)
        .pipe(gulp.dest(destDir))

const taskImages = () =>
    gulp
        .src(glob(imagesGlob), {
            encoding: false,
        })
        .pipe(
            newer({
                ext: ".jpg",
                dest: destDir,
            }),
        )
        .pipe(
            // @ts-ignore
            gm(function (gmfile, done) {
                const maxSize = 1024
                gmfile.size(function (
                    _: Error,
                    { width, height }: { width: number; height: number },
                ) {
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(
                            maxSize / width,
                            maxSize / height,
                        )
                        gmfile = gmfile.resize(
                            Math.round(width * ratio),
                            Math.round(height * ratio),
                        )
                    }
                    return done(null, gmfile.setFormat("jpg"))
                })
            }),
        )
        .pipe(
            image({
                concurrent: 10,
            }),
        )
        .on("error", swallowError)
        .pipe(gulp.dest(destDir))

const taskContent = () =>
    gulp
        .src(miscContentGlob, {
            encoding: false,
        })
        .pipe(newer(destDir))
        .pipe(filelog("misc content"))
        .pipe(gulp.dest(destDir))

const taskOrg = () =>
    gulp
        .src(glob(orgGlob))
        .pipe(newer(destDir))
        .pipe(filelog("pandoc"))
        .pipe(
            pandoc({
                from: "org",
                to: "html5",
                ext: ".html",
                args: [
                    "--toc",
                    "--toc-depth=2",
                    "-s",
                    "--section-divs=true",
                    `--lua-filter=${pandocDir}/lua/code-block.lua`,
                    `--lua-filter=${pandocDir}/lua/images.lua`,
                    `--lua-filter=${pandocDir}/lua/icon.lua`,
                    `--lua-filter=${pandocDir}/lua/metadata.lua`,
                    "--css",
                    "reset.css",
                    "--css",
                    "index.css",
                    "--css",
                    "font-awesome.min.css",
                    "--quiet",
                    `--template=${pandocDir}/template.html`,
                ],
            }),
        )
        .on("error", function (err: Error) {
            console.error(`Error processing file ${err}`)
            // @ts-ignore
            this.emit("end")
        })
        .pipe(gulp.dest(destDir))

const rebuild = async () => {
    await taskOrg()
    await taskContent()
    await taskStatic()
    await taskSvg()
    await taskImages()
}

await rebuild()

if (args.watch) {
    console.log("Watch mode enabled.")
    gulp.watch(glob(args.src), rebuild)
}

if (args.serve) {
    console.log("Server enabled.")
    if (args.watch) {
        gulp.watch(glob(args.src), rebuild)
        gulp.watch(glob(staticDir), rebuild)
    }
    await serve(
        (req) =>
            serveDir(req, {
                fsRoot: args.dest,
                showDirListing: true,
            }),
        {
            port: 3000,
        },
    )
}
