# cockpit-docker

This is the [Cockpit](https://cockpit-project.org/) user interface for [docker
containers](https://docker.io/). 

## Technologies

 - cockpit-docker communicates to docker through its [REST API](https://docs.docker.com/engine/api/v1.43/).

 - This project is based on [cockpit-podman](https://github.com/cockpit-project/cockpit-podman), I ported as much as I could to the docker API, but not everything maps (e.g. pods) and not everything is ported yet.

# Development dependencies

On Debian/Ubuntu:

    $ sudo apt install gettext nodejs make

On Fedora:

    $ sudo dnf install gettext nodejs make

# Getting and building the source

These commands check out the source and build it into the `dist/` directory:

```
git clone https://github.com/chabad360/cockpit-docker
cd cockpit-docker
make
```

# Installing

`sudo make install` installs the package in `/usr/local/share/cockpit/`. This depends
on the `dist` target, which generates the distribution tarball.

You can also run `make rpm` to build RPMs for local installation.

In `production` mode, source files are automatically minified and compressed.
Set `NODE_ENV=production` if you want to duplicate this behavior.

## Arch Derivatives
[AUR package](https://aur.archlinux.org/packages/cockpit-docker)

`yay -Ss cockpit-docker`

OR for Manjaro 

`pamac install cockpit-docker`

# Development instructions

See [HACKING.md](./HACKING.md) for details about how to efficiently change the
code, run, and test it.

# Automated release

The intention is that the only manual step for releasing a project is to create
a signed tag for the version number, which includes a summary of the noteworthy
changes:

```
123

- this new feature
- fix bug #123
```

Pushing the release tag triggers the [release.yml](.github/workflows/release.yml)
[GitHub action](https://github.com/features/actions) workflow. This creates the
official release tarball and publishes as upstream release to GitHub.

The Fedora and COPR releases are done with [Packit](https://packit.dev/),
see the [packit.yaml](./packit.yaml) control file.

# Automated maintenance

It is important to keep your [NPM modules](./package.json) up to date, to keep
up with security updates and bug fixes. This happens with
[dependabot](https://github.com/dependabot),
see [configuration file](.github/dependabot.yml).

Translations are refreshed every Tuesday evening (or manually) through the
[weblate-sync-po.yml](.github/workflows/weblate-sync-po.yml) action.
Conversely, the PO template is uploaded to weblate every day through the
[weblate-sync-pot.yml](.github/workflows/weblate-sync-pot.yml) action.
