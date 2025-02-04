{
  description = "A Deno project with Docker image and inline dependency caching";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.systems.url = "github:nix-systems/default";
  inputs.flake-utils = {
    url = "github:numtide/flake-utils";
    inputs.systems.follows = "systems";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        commonPackages = with pkgs; [
          coreutils
          live-server
          pandoc
          deno
          optipng
          mozjpeg
          pngquant
          zopfli
          graphicsmagick
          bashInteractive
          libwebp
        ];

        # Create a derivation to cache Deno dependencies
        denoDeps = pkgs.stdenv.mkDerivation {
          name = "deno-deps";
          src = ./app;
          
          buildInputs = [ pkgs.deno ];
          
          buildPhase = ''
            export DENO_DIR="$out"
            mkdir -p "$DENO_DIR"
            deno cache --lock=deno.lock build.ts
            deno run -A --no-check --cached-only build.ts --help
          '';
          
          installPhase = "true";  # We don't need to install anything
        };

        dockerImage = pkgs.dockerTools.buildLayeredImage {
          name = "lesh/webbuilder";
          tag = "latest";
          
          contents = commonPackages;
          
          config = {
            Entrypoint = [ "deno" "run" "-A" "--no-check" "--cached-only" "/app/build.ts" ];
            WorkingDir = "/app";
            Env = [
              "DENO_DIR=/app/deno_cache"
            ];
          };

          extraCommands = ''
            mkdir -p app
            cp -r ${./app}/* app/
            mkdir -p app/deno_cache
            cp -r ${denoDeps}/* app/deno_cache/
            mkdir -p tmp
        
          '';
        };
      in
      {
        packages = {
          default = dockerImage;
        };

        devShells.default = pkgs.mkShell {
          packages = commonPackages;
        };
      });
}
