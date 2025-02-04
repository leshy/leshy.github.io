import { green, red } from "https://deno.land/std@0.205.0/fmt/colors.ts"
import { which } from "@david/which"

import mozjpeg from "npm:mozjpeg"
import pngquant from "npm:pngquant-bin"
import zopflipng from "npm:zopflipng-bin"
import cwebp from "npm:cwebp-bin"

import gmlib from "npm:gm"
gmlib.prototype.__proto__ = { _options: {} }

const fileExists = async (path: string): Promise<boolean> => {
    const { state } = await Deno.permissions.query({ name: "read", path })
    if (state === "granted") {
        try {
            const info = await Deno.stat(path)
            return info.isFile || info.isDirectory
        } catch {
            return false
        }
    }
    return false
}

// function of this code is to monkeypatch binaries required by libs
// (we are relying on nix to maintain our binary deps. not node package manager)
async function ensureBin(modulePath: string, binaryName: string) {
    if (await fileExists(modulePath)) {
        return
    }

    const binaryPath = await which(binaryName)

    if (!binaryPath) {
        console.error(" ", red("target binary not found"), binaryName)
        return
    }

    console.log(" ", green("symlink"), binaryPath, green("➔"), modulePath)
    await Deno.symlink(binaryPath, modulePath)
}

export default async function ensureLibs() {
    await ensureBin(mozjpeg, "cjpeg")
    await ensureBin(pngquant, "pngquant")
    await ensureBin(zopflipng, "zopflipng")
    await ensureBin(cwebp, "cwebp")
}
